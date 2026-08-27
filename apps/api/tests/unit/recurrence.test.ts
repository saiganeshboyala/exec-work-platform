import { describe, expect, it } from 'vitest';

import { endFor, occurrenceStarts } from '@/modules/meetings/recurrence';

/** Local time, so the weekday assertions mean what they read as. */
const at = (iso: string): Date => new Date(iso);
const days = (list: Date[]): string[] => list.map((d) => d.toISOString().slice(0, 10));

describe('occurrenceStarts', () => {
  it('includes the meeting itself as the first occurrence', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'DAILY',
      days: [],
      count: 3,
    });

    expect(starts).toHaveLength(3);
    expect(starts[0]?.toISOString()).toBe(at('2026-03-02T09:00:00').toISOString());
  });

  it('steps a day at a time for DAILY', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'DAILY',
      days: [],
      count: 4,
    });

    expect(days(starts)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']);
  });

  it('steps a week at a time for WEEKLY, keeping the weekday', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'WEEKLY',
      days: [],
      count: 3,
    });

    expect(days(starts)).toEqual(['2026-03-02', '2026-03-09', '2026-03-16']);
    expect(new Set(starts.map((d) => d.getDay()))).toEqual(new Set([1]));
  });

  it('skips the weekend for WEEKDAYS', () => {
    // Friday 6 March 2026.
    const starts = occurrenceStarts(at('2026-03-06T09:00:00'), {
      frequency: 'WEEKDAYS',
      days: [],
      count: 3,
    });

    expect(days(starts)).toEqual(['2026-03-06', '2026-03-09', '2026-03-10']);
    expect(starts.some((d) => d.getDay() === 0 || d.getDay() === 6)).toBe(false);
  });

  it('hits only the chosen days for CUSTOM', () => {
    // Monday, Wednesday, Friday from a Monday.
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'CUSTOM',
      days: [1, 3, 5],
      count: 5,
    });

    expect(days(starts)).toEqual([
      '2026-03-02',
      '2026-03-04',
      '2026-03-06',
      '2026-03-09',
      '2026-03-11',
    ]);
  });

  it('keeps the clock time across a daylight-saving change', () => {
    // The UK moves to BST on 29 March 2026; a 09:00 standup must stay 09:00.
    const starts = occurrenceStarts(at('2026-03-27T09:00:00'), {
      frequency: 'DAILY',
      days: [],
      count: 4,
    });

    expect(new Set(starts.map((d) => d.getHours()))).toEqual(new Set([9]));
  });

  it('stops rather than spinning when no day can match', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'CUSTOM',
      days: [],
      count: 10,
    });

    expect(starts).toHaveLength(1);
  });
});

describe('endFor', () => {
  it('gives every occurrence the length of the first', () => {
    const firstStart = at('2026-03-02T09:00:00');
    const firstEnd = at('2026-03-02T09:45:00');
    const later = at('2026-03-09T09:00:00');

    expect(endFor(later, firstStart, firstEnd).toISOString()).toBe(
      at('2026-03-09T09:45:00').toISOString(),
    );
  });
});
