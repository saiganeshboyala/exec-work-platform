import type { Health, ItemStatus } from '@ewp/contracts';

const DAY_MS = 86_400_000;

/**
 * Derives the health signal an executive reads, from facts the team already
 * records. Health is never stored - storing it guarantees it goes stale.
 */
export function deriveHealth(
  status: ItemStatus,
  dueDate: Date | null,
  now: Date = new Date(),
): Health {
  if (status === 'BLOCKED') return 'BLOCKED';
  if (status === 'DONE' || status === 'CANCELLED') return 'ON_TRACK';
  if (!dueDate) return 'ON_TRACK';

  const remainingDays = Math.floor((dueDate.getTime() - now.getTime()) / DAY_MS);
  if (remainingDays < 0) return 'OVERDUE';
  if (remainingDays <= 3 && status === 'NOT_STARTED') return 'AT_RISK';
  if (remainingDays <= 1) return 'AT_RISK';

  return 'ON_TRACK';
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}
