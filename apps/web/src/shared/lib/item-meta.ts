import type { ItemStatus, Priority } from '@ewp/contracts';

/**
 * Presentation metadata for the two enums the board renders as coloured cells.
 * Kept out of the components so the table, the group headers and any future
 * chart all read the same labels and colours.
 */

interface Tone {
  label: string;
  color: string;
  wash: string;
}

export const STATUS_TONE: Record<ItemStatus, Tone> = {
  NOT_STARTED: { label: 'Not started', color: 'var(--neutral)', wash: 'var(--neutral-wash)' },
  IN_PROGRESS: { label: 'Working on it', color: 'var(--accent)', wash: 'var(--accent-wash)' },
  BLOCKED: { label: 'Blocked', color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
  DONE: { label: 'Done', color: 'var(--on-track)', wash: 'var(--on-track-wash)' },
  CANCELLED: { label: 'Cancelled', color: 'var(--ink-muted)', wash: 'var(--surface-sunk)' },
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  LOW: { label: 'Low', color: 'var(--ink-muted)', wash: 'var(--surface-sunk)' },
  MEDIUM: { label: 'Medium', color: 'var(--accent)', wash: 'var(--accent-wash)' },
  HIGH: { label: 'High', color: 'var(--at-risk)', wash: 'var(--at-risk-wash)' },
  CRITICAL: { label: 'Critical', color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
};

/** Group order on the board. Open work first, finished work last. */
export const STATUS_ORDER: readonly ItemStatus[] = [
  'IN_PROGRESS',
  'BLOCKED',
  'NOT_STARTED',
  'DONE',
  'CANCELLED',
];

/** Initials for the owner avatar, e.g. "Priya Raghavan" -> "PR". */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** A stable colour per person, so the same face keeps the same badge. */
export function avatarColor(seed: string): string {
  const palette = ['#2f3b8c', '#1f7a5c', '#a96a12', '#a6362f', '#5b3b8c', '#0f6d7a'];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length] as string;
}

/** An ISO timestamp as the value a native <input type="date"> expects. */
export function toDateInputValue(iso: string | null): string {
  return iso ? (new Date(iso).toISOString().slice(0, 10) as string) : '';
}
