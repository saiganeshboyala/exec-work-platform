import { ROLE_RANK } from '@ewp/contracts';
import type { GrantAccessInput, Role, ScopedAccessDto } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';

export const accessService = {
  async list(auth: AuthContext): Promise<ScopedAccessDto[]> {
    const rows = await prisma.scopedAccess.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        workspace: { select: { name: true } },
        board: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      user: row.user,
      workspaceId: row.workspaceId,
      boardId: row.boardId,
      scopeName: row.workspace?.name ?? row.board?.name ?? 'Unknown',
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    }));
  },

  async grant(auth: AuthContext, input: GrantAccessInput): Promise<ScopedAccessDto> {
    // Nobody may hand out more than they hold.
    if (ROLE_RANK[input.role] > ROLE_RANK[auth.role]) {
      throw AppError.forbidden('You cannot grant a role above your own');
    }

    const member = await prisma.membership.findFirst({
      where: { organizationId: auth.organizationId, userId: input.userId },
    });
    if (!member) throw AppError.notFound('Member');

    if (input.workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: { id: input.workspaceId, organizationId: auth.organizationId, deletedAt: null },
      });
      if (!workspace) throw AppError.notFound('Workspace');
    }

    if (input.boardId) {
      const board = await prisma.board.findFirst({
        where: {
          id: input.boardId,
          deletedAt: null,
          workspace: { organizationId: auth.organizationId },
        },
      });
      if (!board) throw AppError.notFound('Board');
    }

    // Prisma's compound unique cannot be addressed when its parts are null, so
    // re-granting is a find-then-write rather than an upsert.
    const existing = await prisma.scopedAccess.findFirst({
      where: {
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        boardId: input.boardId ?? null,
      },
      select: { id: true },
    });

    const include = {
      user: { select: { id: true, fullName: true, email: true } },
      workspace: { select: { name: true } },
      board: { select: { name: true } },
    } as const;

    const row = existing
      ? await prisma.scopedAccess.update({
          where: { id: existing.id },
          data: { role: input.role },
          include,
        })
      : await prisma.scopedAccess.create({
          data: {
            organizationId: auth.organizationId,
            userId: input.userId,
            workspaceId: input.workspaceId ?? null,
            boardId: input.boardId ?? null,
            role: input.role,
          },
          include,
        });

    return {
      id: row.id,
      user: row.user,
      workspaceId: row.workspaceId,
      boardId: row.boardId,
      scopeName: row.workspace?.name ?? row.board?.name ?? 'Unknown',
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  },

  async revoke(auth: AuthContext, id: string): Promise<void> {
    const row = await prisma.scopedAccess.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!row) throw AppError.notFound('Grant');
    await prisma.scopedAccess.delete({ where: { id } });
  },

  /**
   * The role a user actually has on a board: the better of their org-wide role
   * and any grant covering that board or its workspace. This is what lets a
   * GUEST be an editor on one board and blind to everything else.
   */
  async effectiveRole(
    organizationId: string,
    userId: string,
    orgRole: Role,
    boardId: string,
  ): Promise<Role> {
    const board = await prisma.board.findFirst({
      where: { id: boardId, workspace: { organizationId } },
      select: { workspaceId: true },
    });
    if (!board) return orgRole;

    const grants = await prisma.scopedAccess.findMany({
      where: {
        organizationId,
        userId,
        OR: [{ boardId }, { workspaceId: board.workspaceId }],
      },
      select: { role: true },
    });

    return grants.reduce<Role>(
      (best, grant) => (ROLE_RANK[grant.role] > ROLE_RANK[best] ? grant.role : best),
      orgRole,
    );
  },
};
