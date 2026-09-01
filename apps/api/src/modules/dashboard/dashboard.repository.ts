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
    visibleItems: Prisma.ItemWhereInput = {},
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
          // Both filters are needed, and they are not the same question. A
          // department is visible to anyone holding one task in it; that must
          // not hand them the other twenty. Without this the rollup reports
          // titles, owners and due dates from work the reader cannot open.
          where: { deletedAt: null, ...visibleItems },
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

  completedSince(organizationId: string, since: Date, visibleItems: Prisma.ItemWhereInput = {}) {
    return prisma.item.count({
      where: {
        deletedAt: null,
        completedAt: { gte: since },
        board: { deletedAt: null, workspace: { organizationId, deletedAt: null } },
        ...visibleItems,
      },
    });
  },
};
