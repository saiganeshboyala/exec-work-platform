import type { ActivityDto, WorkloadRowDto } from '@ewp/contracts';

import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { itemFilter } from '@/modules/access';
import { boardsService } from '@/modules/boards';

/** Open work counts for more, and urgent work counts for more again. */
const PRIORITY_WEIGHT = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 } as const;

export const insightsService = {
  /** Who is carrying what. The load figure is a signal, not a science. */
  async workload(auth: AuthContext, workspaceId?: string): Promise<WorkloadRowDto[]> {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    const members = await prisma.membership.findMany({
      where: { organizationId: auth.organizationId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    const items = await prisma.item.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['DONE', 'CANCELLED'] },
        board: {
          deletedAt: null,
          workspace: {
            organizationId: auth.organizationId,
            deletedAt: null,
            ...(workspaceId ? { id: workspaceId } : {}),
          },
        },
      },
      select: { ownerId: true, dueDate: true, priority: true },
    });

    return members
      .map(({ user }) => {
        const mine = items.filter((item) => item.ownerId === user.id);

        return {
          userId: user.id,
          fullName: user.fullName,
          open: mine.length,
          overdue: mine.filter((item) => item.dueDate !== null && item.dueDate < now).length,
          dueThisWeek: mine.filter(
            (item) => item.dueDate !== null && item.dueDate >= now && item.dueDate <= weekEnd,
          ).length,
          critical: mine.filter((item) => item.priority === 'CRITICAL').length,
          load: mine.reduce((sum, item) => sum + PRIORITY_WEIGHT[item.priority], 0),
        };
      })
      .sort((a, b) => b.load - a.load);
  },

  /** The audit trail. Already recorded everywhere; this finally exposes it. */
  async activity(
    auth: AuthContext,
    options: { entityId?: string; take?: number } = {},
  ): Promise<ActivityDto[]> {
    const rows = await prisma.activity.findMany({
      where: {
        organizationId: auth.organizationId,
        ...(options.entityId ? { entityId: options.entityId } : {}),
      },
      include: { actor: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(options.take ?? 50, 200),
    });

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      verb: row.verb,
      actor: row.actor,
      before: row.before,
      after: row.after,
      createdAt: row.createdAt.toISOString(),
    }));
  },

  /**
   * A board as CSV, for the board pack that always gets asked for.
   *
   * Both checks matter. getOrFail is the only thing standing between a guessed
   * board id and somebody else's department; the item filter then keeps the
   * export to the rows the caller could have read on screen anyway. Without
   * them an export was a way round every rule the UI applies.
   */
  async exportBoardCsv(auth: AuthContext, boardId: string): Promise<string> {
    await boardsService.getOrFail(auth, boardId);

    const items = await prisma.item.findMany({
      where: {
        boardId,
        deletedAt: null,
        board: { workspace: { organizationId: auth.organizationId } },
        ...(await itemFilter(auth)),
      },
      include: { owner: { select: { fullName: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const header = ['Task', 'Owner', 'Status', 'Priority', 'Start', 'Due', 'Blocked reason'];
    const rows = items.map((item) => [
      item.title,
      item.owner?.fullName ?? '',
      item.status,
      item.priority,
      item.startDate?.toISOString().slice(0, 10) ?? '',
      item.dueDate?.toISOString().slice(0, 10) ?? '',
      item.blockedReason ?? '',
    ]);

    return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  },
};

/**
 * Quotes anything containing a delimiter, and neutralises leading =, +, - and @
 * so a spreadsheet treats a crafted title as text rather than a formula.
 */
function escapeCsv(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}
