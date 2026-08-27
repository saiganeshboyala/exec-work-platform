import type { Prisma } from '@prisma/client';

import { prisma } from '@/database';

// Deleted tasks are still rows, so an unfiltered count claims a department
// holds work it will not list. Everything that reads items filters on this.
const withCounts = { _count: { select: { items: { where: { deletedAt: null } } } } } as const;

export const boardsRepository = {
  listForWorkspace(workspaceId: string, scope: Prisma.BoardWhereInput = {}) {
    return prisma.board.findMany({
      where: { workspaceId, deletedAt: null, AND: [scope] },
      include: withCounts,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /** Every board the caller may see, for pickers that span workspaces. */
  listForOrganization(organizationId: string, scope: Prisma.BoardWhereInput = {}) {
    return prisma.board.findMany({
      where: {
        deletedAt: null,
        workspace: { organizationId, deletedAt: null },
        AND: [scope],
      },
      include: withCounts,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /** Joins through workspace so the organization filter cannot be forgotten. */
  findById(organizationId: string, id: string, scope: Prisma.BoardWhereInput = {}) {
    return prisma.board.findFirst({
      // AND, never spread: the scope carries its own `id` clause and spreading
      // would silently replace the id being looked up.
      where: {
        id,
        deletedAt: null,
        workspace: { organizationId, deletedAt: null },
        AND: [scope],
      },
      include: withCounts,
    });
  },

  create(data: { workspaceId: string; name: string; description?: string; isPortfolio: boolean }) {
    return prisma.board.create({ data, include: withCounts });
  },

  update(id: string, data: { name?: string; description?: string; isPortfolio?: boolean }) {
    return prisma.board.update({ where: { id }, data, include: withCounts });
  },

  softDelete(id: string) {
    return prisma.board.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
