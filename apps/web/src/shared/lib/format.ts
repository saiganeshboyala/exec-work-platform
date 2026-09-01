/** Display formatting only. No business rules live here. */

import { SCHEDULING_TIME_ZONE, schedulingZoneLabel } from './calendar';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: SCHEDULING_TIME_ZONE,
  }).format(new Date(iso));
}

/**
 * Day-month-year with the month spelled, e.g. 31-Aug-2026. Used for due dates,
 * where 08-09 could be read two ways depending on where you are from.
 */
export function formatDueDate(iso: string | null): string {
  if (!iso) return '—';

  // en-US, not en-GB: the order comes from the template below, so the locale
  // only supplies the month name - and en-GB writes "Sept", which is a letter
  // wider than every other month and makes the column ragged.
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    // A due date is a calendar date, not an instant. Formatting it in any zone
    // but the one it was stored in shows the day before or after.
    timeZone: 'UTC',
  }).formatToParts(new Date(iso));

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('day')}-${value('month')}-${value('year')}`;
}

/**
 * A moment in time, always in the scheduling zone. Two people in different
 * countries reading the same meeting see the same words.
 */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SCHEDULING_TIME_ZONE,
  }).format(new Date(iso));
}

/** The same, with the zone named - for anywhere the time stands on its own. */
export function formatDateTimeWithZone(iso: string): string {
  return `${formatDateTime(iso)} ${schedulingZoneLabel(new Date(iso))}`;
}

/** Just the clock part of an instant, in the scheduling zone. */
export function formatTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SCHEDULING_TIME_ZONE,
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
