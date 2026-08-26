import type { BoardFilters, DueWindow, GroupBy } from '@ewp/contracts';

/**
 * The filter shape itself lives in @ewp/contracts, because a saved view stores
 * it server-side. This module only adds the client-side defaults and helpers.
 */
export type { BoardFilters, DueWindow, GroupBy };

export const DEFAULT_FILTERS: BoardFilters = {
  search: '',
  ownerId: 'any',
  priority: 'any',
  status: 'any',
  due: 'any',
  groupBy: 'status',
  hideDone: false,
};

/** True when anything is narrowing the board, so the reset control can appear. */
export function isFiltered(filters: BoardFilters): boolean {
  return (
    filters.search !== '' ||
    filters.ownerId !== 'any' ||
    filters.priority !== 'any' ||
    filters.status !== 'any' ||
    filters.due !== 'any' ||
    filters.hideDone
  );
}
