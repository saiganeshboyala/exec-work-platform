import type {
  DashboardQuery,
  DecisionQueueRowDto,
  ExecutiveDashboardDto,
  KpiDto,
  PortfolioRowDto,
} from '@ewp/contracts';

import type { AuthContext } from '@/common/types/express';
import { daysBetween, deriveHealth } from '@/common/utils';
import { boardFilter } from '@/modules/access';
import { meetingsService } from '@/modules/meetings';

import { dashboardRepository } from './dashboard.repository';

const OPEN_STATUSES = new Set(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED']);

/**
 * Rolls the item table up into the four numbers, the portfolio list and the
 * decision queue an executive actually reads. Health is derived here from the
 * same helper the item API uses, so a board and the dashboard never disagree.
 */
export const dashboardService = {
  async build(auth: AuthContext, query: DashboardQuery): Promise<ExecutiveDashboardDto> {
    const now = new Date();
    // The rollup must only count what this person is allowed to see, or the
    // headline numbers become a side channel onto boards they cannot open.
    const boards = await dashboardRepository.boardsWithItems(
      auth.organizationId,
      query.workspaceId,
      await boardFilter(auth),
    );

    const portfolio: PortfolioRowDto[] = [];
    const decisionQueue: DecisionQueueRowDto[] = [];

    let openItems = 0;
    let onTrack = 0;
    let atRisk = 0;
    let overdue = 0;

    for (const board of boards) {
      let boardOpen = 0;
      let boardOverdue = 0;
      let worst: 'ON_TRACK' | 'AT_RISK' | 'OVERDUE' | 'BLOCKED' = 'ON_TRACK';
      let nextMilestone: Date | null = null;
      let ownerName: string | null = null;

      for (const item of board.items) {
        if (!OPEN_STATUSES.has(item.status)) continue;

        const health = deriveHealth(item.status, item.dueDate, now);
        boardOpen += 1;
        openItems += 1;

        if (health === 'ON_TRACK') onTrack += 1;
        if (health === 'AT_RISK') atRisk += 1;
        if (health === 'OVERDUE') {
          overdue += 1;
          boardOverdue += 1;
        }
        if (health === 'BLOCKED') {
          decisionQueue.push({
            itemId: item.id,
            title: item.title,
            boardName: board.name,
            blockedReason: item.blockedReason,
            waitingSinceDays: daysBetween(item.updatedAt, now),
          });
        }

        if (rank(health) > rank(worst)) worst = health;
        if (item.dueDate && (!nextMilestone || item.dueDate < nextMilestone)) {
          nextMilestone = item.dueDate;
        }
        ownerName ??= item.owner?.fullName ?? null;
      }

      if (boardOpen > 0) {
        portfolio.push({
          boardId: board.id,
          name: board.name,
          health: worst,
          ownerName,
          openItems: boardOpen,
          overdueItems: boardOverdue,
          nextMilestone: nextMilestone ? nextMilestone.toISOString() : null,
        });
      }
    }

    portfolio.sort((a, b) => rank(b.health) - rank(a.health) || b.overdueItems - a.overdueItems);
    decisionQueue.sort((a, b) => b.waitingSinceDays - a.waitingSinceDays);

    const kpis: KpiDto[] = [
      {
        key: 'activeInitiatives',
        label: 'Active initiatives',
        value: portfolio.length,
        unit: 'count',
        delta: null,
      },
      {
        key: 'onTrackRate',
        label: 'On track',
        value: openItems === 0 ? 100 : Math.round((onTrack / openItems) * 100),
        unit: 'percent',
        delta: null,
      },
      { key: 'atRisk', label: 'At risk', value: atRisk, unit: 'count', delta: null },
      { key: 'overdue', label: 'Overdue', value: overdue, unit: 'count', delta: null },
    ];

    const upcomingMeetings = (await meetingsService.listUpcoming(auth, 5)).map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      startsAt: meeting.startsAt,
    }));

    return {
      kpis,
      portfolio: portfolio.slice(0, 25),
      decisionQueue: decisionQueue.slice(0, 25),
      upcomingMeetings,
      generatedAt: now.toISOString(),
    };
  },
};

function rank(health: string): number {
  return { ON_TRACK: 0, AT_RISK: 1, OVERDUE: 2, BLOCKED: 3 }[health] ?? 0;
}
