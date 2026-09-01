import type { Prisma } from '@prisma/client';

import { prisma } from '@/database';

/**
 * The tally beside a department's name, counting only what the caller may
 * actually open.
 *
 * Deleted tasks are still rows, and so is everybody else's work: counted
 * unfiltered, a department reads "12 tasks" to somebody who can see two of
 * them. The number is small, but it is a real answer to "how busy is this team"
 * for a person not entitled to ask.
 */
const withCounts = (visible: Prisma.ItemWhereInput = {}) =>
  ({ _count: { select: { items: { where: { deletedAt: null, ...visible } } } } }) as const;

export const boardsRepository = {
  listForWorkspace(
    workspaceId: string,
    scope: Prisma.BoardWhereInput = {},
    visibleItems: Prisma.ItemWhereInput = {},
  ) {
    return prisma.board.findMany({
      where: { workspaceId, deletedAt: null, AND: [scope] },
      include: withCounts(visibleItems),
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /** Every board the caller may see, for pickers that span workspaces. */
  listForOrganization(
    organizationId: string,
    scope: Prisma.BoardWhereInput = {},
    visibleItems: Prisma.ItemWhereInput = {},
  ) {
    return prisma.board.findMany({
      where: {
        deletedAt: null,
        workspace: { organizationId, deletedAt: null },
        AND: [scope],
      },
      include: withCounts(visibleItems),
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /** Joins through workspace so the organization filter cannot be forgotten. */
  findById(
    organizationId: string,
    id: string,
    scope: Prisma.BoardWhereInput = {},
    visibleItems: Prisma.ItemWhereInput = {},
  ) {
    return prisma.board.findFirst({
      // AND, never spread: the scope carries its own `id` clause and spreading
      // would silently replace the id being looked up.
      where: {
        id,
        deletedAt: null,
        workspace: { organizationId, deletedAt: null },
        AND: [scope],
      },
      include: withCounts(visibleItems),
    });
  },

  create(data: { workspaceId: string; name: string; description?: string; isPortfolio: boolean }) {
    return prisma.board.create({ data, include: withCounts() });
  },

  update(id: string, data: { name?: string; description?: string; isPortfolio?: boolean }) {
    return prisma.board.update({ where: { id }, data, include: withCounts() });
  },

  softDelete(id: string) {
    return prisma.board.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
