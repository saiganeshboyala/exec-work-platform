import type { Prisma } from '@prisma/client';

import { prisma } from '@/database';

/**
 * Read-side queries only. These are aggregate scans, so they are kept apart
 * from the write-path repositories and are the first thing to move behind a
 * materialized view when the item table gets large.
 */
export const dashboardRepository = {
  boardsWithItems(
    organizationId: string,
    workspaceId?: string,
    scope: Prisma.BoardWhereInput = {},
  ) {
    return prisma.board.findMany({
      where: {
        deletedAt: null,
        workspace: { organizationId, deletedAt: null, ...(workspaceId ? { id: workspaceId } : {}) },
        AND: [scope],
      },
      select: {
        id: true,
        name: true,
        items: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            blockedReason: true,
            updatedAt: true,
            owner: { select: { fullName: true } },
          },
        },
      },
    });
  },

  completedSince(organizationId: string, since: Date) {
    return prisma.item.count({
      where: {
        deletedAt: null,
        completedAt: { gte: since },
        board: { deletedAt: null, workspace: { organizationId, deletedAt: null } },
      },
    });
  },
};
