import type {
  AuthTokens,
  LoginInput,
  RegisterInput,
  SessionUserDto,
  SignUpInput,
  SignUpResultDto,
} from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { env } from '@/config';
import { prisma } from '@/database';
import { activityService } from '@/modules/activity';
import { notificationsService } from '@/modules/notifications';

import { authRepository } from './auth.repository';
import { hashPassword, verifyPassword } from './password.service';
import { buildTokenPair, createRefreshToken, hashToken } from './token.service';

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function toSessionUser(
  user: { id: string; email: string; fullName: string; avatarUrl: string | null; jobTitle: string | null; createdAt: Date },
  membership: { role: SessionUserDto['role']; organization: { id: string; name: string } },
): SessionUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    createdAt: user.createdAt.toISOString(),
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    role: membership.role,
  };
}

/**
 * Which organisation a self-signup asks to join. With a single tenant the
 * choice is unambiguous; otherwise it must be named explicitly so people are
 * never dropped into an arbitrary company.
 */
async function resolveSignUpOrganization() {
  if (env.SIGNUP_ORG_SLUG) {
    const named = await prisma.organization.findUnique({ where: { slug: env.SIGNUP_ORG_SLUG } });
    if (!named) throw AppError.internal('The organisation open for signup no longer exists');
    return named;
  }

  const organizations = await prisma.organization.findMany({ take: 2 });
  if (organizations.length === 1) return organizations[0] as (typeof organizations)[number];

  throw AppError.badRequest(
    'Signup is not configured on this server. Set SIGNUP_ORG_SLUG to the organisation new people should join.',
  );
}

export const authService = {
  /**
   * Self-service signup. Creates the account but leaves the membership PENDING,
   * so nothing can be reached until an administrator approves it. The response
   * is deliberately identical whether or not the email already exists, so this
   * endpoint cannot be used to enumerate accounts.
   */
  async signUp(input: SignUpInput, requestId?: string): Promise<SignUpResultDto> {
    const pending: SignUpResultDto = {
      status: 'PENDING',
      message: 'Your request has been sent. You can sign in once an administrator approves it.',
    };

    const organization = await resolveSignUpOrganization();
    const existing = await authRepository.findUserByEmail(input.email);

    // Already known here: say nothing new, and do not touch the account.
    if (existing) return pending;

    const passwordHash = await hashPassword(input.password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          jobTitle: input.jobTitle ?? null,
          passwordHash,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'VIEWER',
          status: 'PENDING',
        },
      });

      return user;
    });

    await activityService.record({
      organizationId: organization.id,
      actorId: created.id,
      entityType: 'Membership',
      entityId: created.id,
      verb: 'JOINED',
      after: { email: input.email, status: 'PENDING', message: input.message ?? null },
      requestId,
    });

    // Tell whoever can act on it that somebody is waiting.
    const approvers = await prisma.membership.findMany({
      where: {
        organizationId: organization.id,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });

    if (approvers.length > 0) {
      await notificationsService.notify({
        organizationId: organization.id,
        userIds: approvers.map((approver) => approver.userId),
        title: 'Someone wants to join',
        body: `${input.fullName} (${input.email}) is waiting for approval`,
        url: '/admin',
      });
    }

    return pending;
  },

  /** Creates the tenant, its first user and an OWNER membership atomically. */
  async register(input: RegisterInput, meta: RequestMeta) {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw AppError.conflict('That email is already registered');

    const passwordHash = await hashPassword(input.password);

    const { user, membership } = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: `${slugify(input.organizationName)}-${Date.now().toString(36)}`,
        },
      });

      const createdUser = await tx.user.create({
        data: { email: input.email, fullName: input.fullName, passwordHash },
      });

      const createdMembership = await tx.membership.create({
        data: { userId: createdUser.id, organizationId: organization.id, role: 'OWNER' },
        include: { organization: true },
      });

      await activityService.record(
        {
          organizationId: organization.id,
          actorId: createdUser.id,
          entityType: 'Organization',
          entityId: organization.id,
          verb: 'CREATED',
          after: { name: organization.name },
          requestId: meta.requestId,
        },
        tx,
      );

      return { user: createdUser, membership: createdMembership };
    });

    const context: AuthContext = {
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    };

    return {
      user: toSessionUser(user, membership),
      tokens: await issueSession(context, meta),
    };
  },

  async login(input: LoginInput, meta: RequestMeta) {
    const user = await authRepository.findUserByEmail(input.email);

    // Always run a verification so timing does not leak account existence.
    const passwordOk = await verifyPassword(
      user?.passwordHash ?? '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      input.password,
    );

    if (!user || !passwordOk) throw AppError.invalidCredentials();

    const membership = user.memberships[0];
    if (!membership) throw AppError.forbidden('Your account is not attached to an organization');

    // An approved membership is what actually grants access; the password only
    // proves who you are.
    if (membership.status === 'PENDING') {
      throw AppError.forbidden(
        'Your account is waiting for an administrator to approve it. You will be able to sign in once it is.',
      );
    }
    if (membership.status === 'REJECTED') {
      throw AppError.forbidden('Your request to join was declined. Contact an administrator.');
    }

    await authRepository.touchLastActive(user.id);

    const context: AuthContext = {
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    };

    return {
      user: toSessionUser(user, membership),
      tokens: await issueSession(context, meta),
    };
  },

  /** Rotates the refresh token: the presented one is revoked as it is used. */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    const stored = await authRepository.findRefreshToken(hashToken(refreshToken));

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthenticated('Your session expired. Sign in again');
    }

    const user = await authRepository.findUserById(stored.userId);
    const membership = user?.memberships[0];
    if (!user || !membership) throw AppError.unauthenticated();

    await authRepository.revokeRefreshToken(stored.tokenHash);

    return issueSession(
      { userId: user.id, organizationId: membership.organizationId, role: membership.role },
      meta,
    );
  },

  async logout(refreshToken: string): Promise<void> {
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
  },

  async logoutEverywhere(userId: string): Promise<void> {
    await authRepository.revokeAllForUser(userId);
  },

  async currentUser(userId: string): Promise<SessionUserDto> {
    const user = await authRepository.findUserById(userId);
    const membership = user?.memberships[0];
    if (!user || !membership) throw AppError.notFound('User');
    return toSessionUser(user, membership);
  },
};

async function issueSession(context: AuthContext, meta: RequestMeta): Promise<AuthTokens> {
  const { token, tokenHash, expiresAt } = createRefreshToken();

  await authRepository.storeRefreshToken({
    userId: context.userId,
    tokenHash,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300),
    ipAddress: meta.ipAddress?.slice(0, 64),
  });

  return buildTokenPair(context, token);
}

export const INVITATION_TTL_DAYS = env.INVITATION_TTL_DAYS;
