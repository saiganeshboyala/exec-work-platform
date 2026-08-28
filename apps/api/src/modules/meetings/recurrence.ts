import type { RepeatInput } from '@ewp/contracts';

/**
 * The start times for a repeating meeting, the first one included.
 *
 * Days are stepped with setDate rather than by adding milliseconds, so an
 * occurrence that crosses a daylight-saving boundary keeps its clock time: a
 * 09:00 standup stays at 09:00 rather than drifting to 08:00 for half the year.
 *
 * WEEKDAYS and CUSTOM skip days that do not match, and are capped so an
 * impossible pattern cannot spin: only 7 days are ever searched per occurrence,
 * which is enough to find the next matching weekday.
 */
export function occurrenceStarts(first: Date, repeat: RepeatInput): Date[] {
  const wanted =
    repeat.frequency === 'WEEKDAYS'
      ? [1, 2, 3, 4, 5]
      : repeat.frequency === 'CUSTOM'
        ? [...new Set(repeat.days)].sort()
        : null;

  const starts: Date[] = [];
  const cursor = new Date(first);

  // A pattern the first meeting does not itself match still starts from it:
  // the organiser picked that moment deliberately.
  starts.push(new Date(cursor));

  while (starts.length < repeat.count) {
    if (repeat.frequency === 'WEEKLY') {
      cursor.setDate(cursor.getDate() + 7);
      starts.push(new Date(cursor));
      continue;
    }

    if (wanted === null) {
      cursor.setDate(cursor.getDate() + 1);
      starts.push(new Date(cursor));
      continue;
    }

    // Walk forward to the next day the pattern allows.
    let stepped = 0;
    do {
      cursor.setDate(cursor.getDate() + 1);
      stepped += 1;
    } while (!wanted.includes(cursor.getDay()) && stepped < 7);

    if (!wanted.includes(cursor.getDay())) break;
    starts.push(new Date(cursor));
  }

  return starts;
}

/** Keeps each occurrence exactly as long as the one the organiser set up. */
export function endFor(start: Date, firstStart: Date, firstEnd: Date): Date {
  return new Date(start.getTime() + (firstEnd.getTime() - firstStart.getTime()));
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * The same pattern as an RFC 5545 rule, so the calendar can hold the series as
 * one recurring event instead of one event per occurrence.
 *
 * That distinction is the difference between an attendee receiving a single
 * invitation and receiving one per week, and between the organiser getting one
 * acceptance and getting one per week per person.
 *
 * COUNT includes the first occurrence, and a rule's start is always its first
 * instance even when it does not match BYDAY - both of which match how
 * occurrenceStarts builds the local rows, so the two never disagree.
 */
export function toRRule(repeat: RepeatInput): string {
  if (repeat.frequency === 'DAILY') return `RRULE:FREQ=DAILY;COUNT=${repeat.count}`;

  const days =
    repeat.frequency === 'WEEKDAYS'
      ? ['MO', 'TU', 'WE', 'TH', 'FR']
      : repeat.frequency === 'CUSTOM'
        ? [...new Set(repeat.days)].sort().map((day) => RRULE_DAYS[day] as string)
        : null;

  if (days === null) return `RRULE:FREQ=WEEKLY;COUNT=${repeat.count}`;
  return `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')};COUNT=${repeat.count}`;
}
