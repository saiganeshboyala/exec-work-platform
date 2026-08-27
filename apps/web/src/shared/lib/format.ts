/** Display formatting only. No business rules live here. */

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
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
    // A due date is a calendar date, not an instant. Formatting it locally
    // shows the day before to anyone west of UTC.
    timeZone: 'UTC',
  }).formatToParts(new Date(iso));

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('day')}-${value('month')}-${value('year')}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
