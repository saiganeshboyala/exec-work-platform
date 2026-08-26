import { randomBytes } from 'node:crypto';

import {
  ROLE_RANK,
  type AcceptInvitationInput,
  type ApproveMemberInput,
  type ChangeRoleInput,
  type InvitationDto,
  type InviteMemberInput,
  type MemberDto,
  type PendingMemberDto,
} from '@ewp/contracts';

import { AppError } from '@/common/errors';
import { logger } from '@/common/logger';
import type { AuthContext } from '@/common/types/express';
import { env } from '@/config';
import { prisma } from '@/database';
import { emailProvider } from '@/integrations/email';
import { emailQueue, JobName } from '@/jobs';
import { activityService } from '@/modules/activity';
import { hashPassword, hashToken } from '@/modules/auth';
import { notificationsService } from '@/modules/notifications';

import { buildInvitationEmail } from './invitation.email';
import { membersRepository } from './members.repository';

type MembershipRow = Awaited<ReturnType<typeof membersRepository.updateRole>>;

function toMemberDto(row: MembershipRow): MemberDto {
  return {
    userId: row.user.id,
    email: row.user.email,
    fullName: row.user.fullName,
    jobTitle: row.user.jobTitle,
    role: row.role,
    status: row.status,
    joinedAt: row.joinedAt.toISOString(),
    lastActiveAt: row.user.lastActiveAt?.toISOString() ?? null,
  };
}

export const membersService = {
  async list(auth: AuthContext): Promise<MemberDto[]> {
    return (await membersRepository.listMembers(auth.organizationId)).map(toMemberDto);
  },

  async listPending(auth: AuthContext): Promise<PendingMemberDto[]> {
    const rows = await membersRepository.listPending(auth.organizationId);
    return rows.map((row) => ({
      userId: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      jobTitle: row.user.jobTitle,
      requestedAt: row.joinedAt.toISOString(),
    }));
  },

  /** Approving is what turns a signup into an account that can be used. */
  async approve(
    auth: AuthContext,
    userId: string,
    input: ApproveMemberInput,
    requestId: string,
  ): Promise<MemberDto> {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: auth.organizationId } },
      include: { user: true },
    });
    if (!membership) throw AppError.notFound('Request');
    if (membership.status !== 'PENDING') throw AppError.conflict('That request was already decided');

    if (ROLE_RANK[input.role] > ROLE_RANK[auth.role]) {
      throw AppError.forbidden('You cannot grant a role above your own');
    }

    const updated = await prisma.membership.update({
      where: { userId_organizationId: { userId, organizationId: auth.organizationId } },
      data: {
        status: 'ACTIVE',
        role: input.role,
        decidedAt: new Date(),
        decidedById: auth.userId,
      },
      include: { user: true },
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Membership',
      entityId: userId,
      verb: 'INVITED',
      after: { status: 'ACTIVE', role: input.role },
      requestId,
    });

    await notificationsService.notify({
      organizationId: auth.organizationId,
      userIds: [userId],
      title: 'Your account was approved',
      body: 'You can now sign in and start working.',
      url: '/',
    });

    return toMemberDto(updated);
  },

  async reject(auth: AuthContext, userId: string, requestId: string): Promise<void> {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: auth.organizationId } },
    });
    if (!membership) throw AppError.notFound('Request');
    if (membership.status !== 'PENDING') throw AppError.conflict('That request was already decided');

    await prisma.membership.update({
      where: { userId_organizationId: { userId, organizationId: auth.organizationId } },
      data: { status: 'REJECTED', decidedAt: new Date(), decidedById: auth.userId },
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Membership',
      entityId: userId,
      verb: 'DELETED',
      after: { status: 'REJECTED' },
      requestId,
    });
  },

  async listInvitations(auth: AuthContext): Promise<InvitationDto[]> {
    const rows = await membersRepository.listInvitations(auth.organizationId);
    const inviterIds = [...new Set(rows.map((row) => row.invitedById))];
    const inviters = await prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, fullName: true },
    });
    const byId = new Map(inviters.map((user) => [user.id, user]));

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      invitedBy: byId.get(row.invitedById) ?? { id: row.invitedById, fullName: 'Removed user' },
      emailDeliveredAt: row.emailDeliveredAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  },

  /**
   * Creates the invitation and hands delivery to the queue. The HTTP response
   * does not wait on the mail provider, so a slow provider cannot slow the UI.
   */
  async invite(auth: AuthContext, input: InviteMemberInput, requestId: string): Promise<InvitationDto> {
    if (ROLE_RANK[input.role] > ROLE_RANK[auth.role]) {
      throw AppError.forbidden('You cannot grant a role above your own');
    }

    const existingMember = await prisma.user.findFirst({
      where: { email: input.email, memberships: { some: { organizationId: auth.organizationId } } },
    });
    if (existingMember) throw AppError.conflict('That person is already a member');

    const pending = await membersRepository.findPendingInvitation(auth.organizationId, input.email);
    if (pending) throw AppError.conflict('An invitation is already waiting for that address');

    const token = randomBytes(32).toString('base64url');
    const invitation = await membersRepository.createInvitation({
      organizationId: auth.organizationId,
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedById: auth.userId,
      message: input.message,
      expiresAt: new Date(Date.now() + env.INVITATION_TTL_DAYS * 86_400_000),
    });

    // The raw token never touches the database, so it rides on the job payload.
    await emailQueue.add(JobName.SEND_INVITATION_EMAIL, { invitationId: invitation.id, token });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Invitation',
      entityId: invitation.id,
      verb: 'INVITED',
      after: { email: invitation.email, role: invitation.role },
      requestId,
    });

    const [dto] = await this.listInvitations(auth);
    return dto ?? {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedBy: { id: auth.userId, fullName: '' },
      emailDeliveredAt: null,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  },

  async revokeInvitation(auth: AuthContext, invitationId: string): Promise<void> {
    const invitation = await membersRepository.findInvitationById(invitationId);
    if (!invitation || invitation.organizationId !== auth.organizationId) {
      throw AppError.notFound('Invitation');
    }
    await membersRepository.updateInvitationStatus(invitationId, 'REVOKED');
  },

  /** Turns a valid invitation into a user plus a membership, in one transaction. */
  async acceptInvitation(input: AcceptInvitationInput) {
    const invitation = await membersRepository.findInvitationByHash(hashToken(input.token));

    if (!invitation || invitation.status !== 'PENDING') throw AppError.invitationInvalid();
    if (invitation.expiresAt < new Date()) {
      await membersRepository.updateInvitationStatus(invitation.id, 'EXPIRED');
      throw AppError.invitationInvalid('That invitation expired. Ask for a new one');
    }

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: invitation.email },
        update: { fullName: input.fullName, passwordHash },
        create: { email: invitation.email, fullName: input.fullName, passwordHash },
      });

      await tx.membership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
        update: { role: invitation.role },
        create: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      await activityService.record(
        {
          organizationId: invitation.organizationId,
          actorId: user.id,
          entityType: 'Membership',
          entityId: user.id,
          verb: 'JOINED',
          after: { email: user.email, role: invitation.role },
        },
        tx,
      );

      return { userId: user.id, organizationId: invitation.organizationId, role: invitation.role };
    });
  },

  async changeRole(
    auth: AuthContext,
    userId: string,
    input: ChangeRoleInput,
    requestId: string,
  ): Promise<MemberDto> {
    if (userId === auth.userId) throw AppError.badRequest('You cannot change your own role');
    if (ROLE_RANK[input.role] > ROLE_RANK[auth.role]) {
      throw AppError.forbidden('You cannot grant a role above your own');
    }

    const existing = await membersRepository.findMembership(auth.organizationId, userId);
    if (!existing) throw AppError.notFound('Member');

    if (existing.role === 'OWNER' && (await membersRepository.countOwners(auth.organizationId)) <= 1) {
      throw AppError.conflict('An organization needs at least one owner');
    }

    const updated = await membersRepository.updateRole(auth.organizationId, userId, input.role);

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Membership',
      entityId: userId,
      verb: 'UPDATED',
      before: { role: existing.role },
      after: { role: updated.role },
      requestId,
    });

    return toMemberDto(updated);
  },

  async remove(auth: AuthContext, userId: string, requestId: string): Promise<void> {
    if (userId === auth.userId) throw AppError.badRequest('You cannot remove yourself');

    const existing = await membersRepository.findMembership(auth.organizationId, userId);
    if (!existing) throw AppError.notFound('Member');
    if (existing.role === 'OWNER') throw AppError.conflict('Transfer ownership before removing an owner');

    await membersRepository.removeMembership(auth.organizationId, userId);

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Membership',
      entityId: userId,
      verb: 'DELETED',
      before: { role: existing.role },
      requestId,
    });
  },
};

/**
 * Called by the email worker, not by a controller. Kept here because the copy
 * and the delivery state both belong to this module.
 */
export async function deliverInvitationEmail(invitationId: string, token?: string): Promise<void> {
  const invitation = await membersRepository.findInvitationById(invitationId);
  if (!invitation || invitation.status !== 'PENDING') {
    logger.warn({ invitationId }, 'Skipping delivery for a non-pending invitation');
    return;
  }

  const inviter = await prisma.user.findUnique({
    where: { id: invitation.invitedById },
    select: { fullName: true },
  });

  const message = buildInvitationEmail({
    to: invitation.email,
    organizationName: invitation.organization.name,
    inviterName: inviter?.fullName ?? 'A colleague',
    role: invitation.role,
    acceptUrl: `${env.WEB_BASE_URL}/invitations/accept?token=${token ?? ''}`,
    message: invitation.message,
  });

  await emailProvider.send(message);
  await membersRepository.markInvitationDelivered(invitation.id);
}
