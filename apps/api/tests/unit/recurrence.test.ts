import { describe, expect, it } from 'vitest';

import { endFor, occurrenceStarts, toRRule } from '@/modules/meetings/recurrence';

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

describe('toRRule', () => {
  it('writes a daily rule', () => {
    expect(toRRule({ frequency: 'DAILY', days: [], count: 4 })).toBe('RRULE:FREQ=DAILY;COUNT=4');
  });

  it('writes weekdays as a weekly rule over Monday to Friday', () => {
    expect(toRRule({ frequency: 'WEEKDAYS', days: [], count: 10 })).toBe(
      'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=10',
    );
  });

  it('writes a plain weekly rule', () => {
    expect(toRRule({ frequency: 'WEEKLY', days: [], count: 12 })).toBe(
      'RRULE:FREQ=WEEKLY;COUNT=12',
    );
  });

  it('writes chosen days in calendar order', () => {
    expect(toRRule({ frequency: 'CUSTOM', days: [5, 1, 3], count: 6 })).toBe(
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6',
    );
  });

  it('agrees with the local occurrences it stands in for', () => {
    // Monday, Wednesday, Friday from a Monday: the rule and the rows must
    // describe the same five meetings, or the calendar and the app disagree.
    const repeat = { frequency: 'CUSTOM' as const, days: [1, 3, 5], count: 5 };
    const starts = occurrenceStarts(new Date('2026-03-02T09:00:00'), repeat);

    expect(starts).toHaveLength(repeat.count);
    expect(toRRule(repeat)).toContain('COUNT=5');
    expect(new Set(starts.map((d) => d.getDay()))).toEqual(new Set([1, 3, 5]));
  });
});
