import { z } from 'zod';

import type { Health } from './enums';

export const dashboardQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  /** Rolling window used for trend deltas. */
  days: z.coerce.number().int().min(7).max(365).default(30),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface KpiDto {
  key: 'activeInitiatives' | 'onTrackRate' | 'atRisk' | 'overdue';
  label: string;
  value: number;
  unit: 'count' | 'percent';
  /** Change against the previous window. Null when there is no comparable window. */
  delta: number | null;
}

export interface PortfolioRowDto {
  boardId: string;
  name: string;
  health: Health;
  ownerName: string | null;
  openItems: number;
  overdueItems: number;
  nextMilestone: string | null;
}

export interface DecisionQueueRowDto {
  itemId: string;
  title: string;
  boardName: string;
  blockedReason: string | null;
  waitingSinceDays: number;
}

export interface ExecutiveDashboardDto {
  kpis: KpiDto[];
  portfolio: PortfolioRowDto[];
  decisionQueue: DecisionQueueRowDto[];
  upcomingMeetings: Array<{ id: string; title: string; startsAt: string }>;
  generatedAt: string;
}
