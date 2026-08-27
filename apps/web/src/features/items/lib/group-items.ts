import type { ItemDto } from '@ewp/contracts';

import { PRIORITY_TONE, STATUS_ORDER, STATUS_TONE } from '@/shared/lib/item-meta';

import type { BoardFilters } from './board-filters';

export interface ItemGroup {
  key: string;
  label: string;
  color: string;
  items: ItemDto[];
  /** Only status groups can accept a new task with a meaningful status. */
  createStatus: ItemDto['status'] | null;
}

const startOfToday = (): Date => {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day;
};

/** Filtering and grouping are pure so the board stays trivially testable. */
export function applyFilters(
  items: ItemDto[],
  filters: BoardFilters,
  currentUserId: string | undefined,
): ItemDto[] {
  const term = filters.search.trim().toLowerCase();
  const today = startOfToday();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  return items.filter((item) => {
    if (term !== '' && !item.title.toLowerCase().includes(term)) return false;
    if (filters.hideDone && (item.status === 'DONE' || item.status === 'CANCELLED')) return false;
    if (filters.status !== 'any' && item.status !== filters.status) return false;
    if (filters.priority !== 'any' && item.priority !== filters.priority) return false;

    // A person is "on" a task if they own it or are assigned to it, so
    // filtering by someone finds everything they are actually involved in.
    const people = [item.owner?.id, ...item.assignees.map((person) => person.id)].filter(Boolean);

    if (filters.ownerId === 'none' && people.length > 0) return false;
    if (filters.ownerId === 'me' && !people.includes(currentUserId)) return false;
    if (
      filters.ownerId !== 'any' &&
      filters.ownerId !== 'me' &&
      filters.ownerId !== 'none' &&
      !people.includes(filters.ownerId)
    ) {
      return false;
    }

    if (filters.due !== 'any') {
      const due = item.dueDate ? new Date(item.dueDate) : null;
      if (filters.due === 'none' && due !== null) return false;
      if (filters.due !== 'none') {
        if (due === null) return false;
        if (filters.due === 'overdue' && !(due < today && item.status !== 'DONE')) return false;
        if (filters.due === 'today' && due.toDateString() !== today.toDateString()) return false;
        if (filters.due === 'week' && !(due >= today && due <= weekEnd)) return false;
      }
    }

    return true;
  });
}

export function groupItems(items: ItemDto[], groupBy: BoardFilters['groupBy']): ItemGroup[] {
  // One plain list with one place to add a task. An empty label tells the table
  // to skip its heading, so nothing announces a group that does not exist.
  if (groupBy === 'none') {
    return [
      {
        key: 'all',
        label: '',
        color: 'var(--ink)',
        items,
        createStatus: 'NOT_STARTED',
      },
    ];
  }

  if (groupBy === 'status') {
    return STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_TONE[status].label,
      color: STATUS_TONE[status].color,
      items: items.filter((item) => item.status === status),
      createStatus: status,
    }));
  }

  if (groupBy === 'priority') {
    return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => ({
      key: priority,
      label: PRIORITY_TONE[priority].label,
      color: PRIORITY_TONE[priority].color,
      items: items.filter((item) => item.priority === priority),
      createStatus: null,
    }));
  }

  if (groupBy === 'owner') {
    const owners = new Map<string, { label: string; items: ItemDto[] }>();

    for (const item of items) {
      const key = item.owner?.id ?? 'unassigned';
      const label = item.owner?.fullName ?? 'Unassigned';
      const bucket = owners.get(key) ?? { label, items: [] };
      bucket.items.push(item);
      owners.set(key, bucket);
    }

    return [...owners.entries()]
      .sort((a, b) => (a[0] === 'unassigned' ? 1 : b[0] === 'unassigned' ? -1 : a[1].label.localeCompare(b[1].label)))
      .map(([key, bucket]) => ({
        key,
        label: bucket.label,
        color: 'var(--accent)',
        items: bucket.items,
        createStatus: null,
      }));
  }

  // Due-date buckets, ordered by urgency rather than by calendar.
  const today = startOfToday();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const buckets: Array<{ key: string; label: string; color: string; test: (item: ItemDto) => boolean }> = [
    {
      key: 'overdue',
      label: 'Overdue',
      color: 'var(--blocked)',
      test: (item) => item.dueDate !== null && new Date(item.dueDate) < today && item.status !== 'DONE',
    },
    {
      key: 'week',
      label: 'Next 7 days',
      color: 'var(--at-risk)',
      test: (item) =>
        item.dueDate !== null &&
        new Date(item.dueDate) >= today &&
        new Date(item.dueDate) <= weekEnd,
    },
    {
      key: 'later',
      label: 'Later',
      color: 'var(--on-track)',
      test: (item) => item.dueDate !== null && new Date(item.dueDate) > weekEnd,
    },
    { key: 'none', label: 'No due date', color: 'var(--neutral)', test: (item) => item.dueDate === null },
  ];

  const seen = new Set<string>();
  return buckets.map((bucket) => {
    const bucketItems = items.filter((item) => !seen.has(item.id) && bucket.test(item));
    for (const item of bucketItems) seen.add(item.id);
    return { key: bucket.key, label: bucket.label, color: bucket.color, items: bucketItems, createStatus: null };
  });
}
