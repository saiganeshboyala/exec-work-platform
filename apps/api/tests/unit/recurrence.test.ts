import { describe, expect, it } from 'vitest';

import {
  endFor,
  occurrenceStarts,
  SCHEDULING_TIME_ZONE,
  toRRule,
} from '@/modules/meetings/recurrence';

/**
 * The tests run in the organiser's zone, which is the only one the weekday
 * assertions can sensibly be read in. IST is used because that is what this
 * deployment runs on, and because it has no daylight saving to muddy the
 * arithmetic being checked.
 */
const ZONE = 'Asia/Kolkata';

/** Local time, so the weekday assertions mean what they read as. */
const at = (iso: string): Date => new Date(iso);
const days = (list: Date[]): string[] => list.map((d) => d.toISOString().slice(0, 10));

describe('occurrenceStarts', () => {
  it('includes the meeting itself as the first occurrence', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'DAILY',
      days: [],
      count: 3,
    }, ZONE);

    expect(starts).toHaveLength(3);
    expect(starts[0]?.toISOString()).toBe(at('2026-03-02T09:00:00').toISOString());
  });

  it('steps a day at a time for DAILY', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'DAILY',
      days: [],
      count: 4,
    }, ZONE);

    expect(days(starts)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']);
  });

  it('steps a week at a time for WEEKLY, keeping the weekday', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'WEEKLY',
      days: [],
      count: 3,
    }, ZONE);

    expect(days(starts)).toEqual(['2026-03-02', '2026-03-09', '2026-03-16']);
    expect(new Set(starts.map((d) => d.getDay()))).toEqual(new Set([1]));
  });

  it('skips the weekend for WEEKDAYS', () => {
    // Friday 6 March 2026.
    const starts = occurrenceStarts(at('2026-03-06T09:00:00'), {
      frequency: 'WEEKDAYS',
      days: [],
      count: 3,
    }, ZONE);

    expect(days(starts)).toEqual(['2026-03-06', '2026-03-09', '2026-03-10']);
    expect(starts.some((d) => d.getDay() === 0 || d.getDay() === 6)).toBe(false);
  });

  it('hits only the chosen days for CUSTOM', () => {
    // Monday, Wednesday, Friday from a Monday.
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'CUSTOM',
      days: [1, 3, 5],
      count: 5,
    }, ZONE);

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
    }, ZONE);

    expect(new Set(starts.map((d) => d.getHours()))).toEqual(new Set([9]));
  });

  it('stops rather than spinning when no day can match', () => {
    const starts = occurrenceStarts(at('2026-03-02T09:00:00'), {
      frequency: 'CUSTOM',
      days: [],
      count: 10,
    }, ZONE);

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
    const starts = occurrenceStarts(new Date('2026-03-02T09:00:00'), repeat, ZONE);

    expect(starts).toHaveLength(repeat.count);
    expect(toRRule(repeat)).toContain('COUNT=5');
    expect(new Set(starts.map((d) => d.getDay()))).toEqual(new Set([1, 3, 5]));
  });
});

describe('occurrences do not depend on the server clock', () => {
  /** The weekday a person in that zone would call it. */
  const dayIn = (date: Date, timeZone: string): string =>
    new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone }).format(date);

  it('keeps Monday to Friday on weekdays for an early-morning meeting', () => {
    // 02:00 in Delhi is 20:30 the previous day in UTC. A server reading its own
    // clock calls that Sunday, and walks a pattern that drifts a day - putting
    // an occurrence on Saturday and skipping the Monday.
    const twoAmIst = new Date(Date.UTC(2026, 7, 30, 20, 30));

    const starts = occurrenceStarts(twoAmIst, { frequency: 'WEEKDAYS', days: [], count: 10 }, ZONE);

    const shown = starts.map((date) => dayIn(date, ZONE));
    expect(shown).not.toContain('Sat');
    expect(shown).not.toContain('Sun');
    expect(shown.filter((day) => day === 'Mon')).toHaveLength(2);
  });

  it('puts a chosen-days series on exactly those days', () => {
    const twoAmIst = new Date(Date.UTC(2026, 7, 30, 20, 30));

    const starts = occurrenceStarts(
      twoAmIst,
      { frequency: 'CUSTOM', days: [1, 3, 5], count: 6 },
      ZONE,
    );

    expect(new Set(starts.map((date) => dayIn(date, ZONE)))).toEqual(
      new Set(['Mon', 'Wed', 'Fri']),
    );
  });

  it('keeps the same time of day in that zone', () => {
    const timeIn = (date: Date): string =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: ZONE,
      }).format(date);

    const twoAmIst = new Date(Date.UTC(2026, 7, 30, 20, 30));
    const starts = occurrenceStarts(twoAmIst, { frequency: 'DAILY', days: [], count: 5 }, ZONE);

    expect(new Set(starts.map(timeIn))).toEqual(new Set(['02:00']));
  });
});

describe('the scheduling zone follows the Central clock', () => {
  const hourOf = (date: Date): string =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: SCHEDULING_TIME_ZONE,
    }).format(date);

  it('is the zone people in Central actually keep', () => {
    // A fixed -6 was tried here and read an hour behind the wall clock from
    // March to November, which is most of the year.
    const summer = new Date(Date.UTC(2026, 6, 15, 14));
    const winter = new Date(Date.UTC(2026, 0, 15, 15));

    expect(hourOf(summer)).toBe('09:00');
    expect(hourOf(winter)).toBe('09:00');
  });

  it('holds a daily series at the same hour across the March clock change', () => {
    // 09:00 on 6 March 2026, two days before the clocks spring forward.
    const nineAm = new Date(Date.UTC(2026, 2, 6, 15));
    const starts = occurrenceStarts(
      nineAm,
      { frequency: 'DAILY', days: [], count: 6 },
      SCHEDULING_TIME_ZONE,
    );

    // The clock time is what the organiser chose, so that is what is kept.
    expect(new Set(starts.map(hourOf))).toEqual(new Set(['09:00']));
    // The instant behind it moves by the hour the clocks did - which is the
    // whole point: 09:00 on either side of the change is not the same moment.
    expect(new Set(starts.map((date) => date.getUTCHours()))).toEqual(new Set([15, 14]));
  });
});

describe('turning a one-off into a repeat', () => {
  const dayIn = (date: Date): string =>
    new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      timeZone: SCHEDULING_TIME_ZONE,
    }).format(date);

  it('keeps the meeting already booked as the first occurrence', () => {
    // The case this exists for: booked once for a Wednesday, meant to be every
    // weekday. The Wednesday must not move, or the invitation people hold and
    // the meeting they turn up to stop being the same one.
    const wednesday = new Date(Date.UTC(2026, 8, 2, 14));

    const starts = occurrenceStarts(
      wednesday,
      { frequency: 'WEEKDAYS', days: [], count: 5 },
      SCHEDULING_TIME_ZONE,
    );

    expect(starts[0]?.getTime()).toBe(wednesday.getTime());
    expect(starts).toHaveLength(5);
    expect(starts.map(dayIn)).toEqual(['Wed', 'Thu', 'Fri', 'Mon', 'Tue']);
  });

  it('counts the meeting that already exists towards the total', () => {
    const start = new Date(Date.UTC(2026, 8, 2, 14));
    const starts = occurrenceStarts(
      start,
      { frequency: 'WEEKLY', days: [], count: 4 },
      SCHEDULING_TIME_ZONE,
    );

    // Four in total, so three are added - not four on top of the one booked.
    expect(starts).toHaveLength(4);
    expect(toRRule({ frequency: 'WEEKLY', days: [], count: 4 })).toContain('COUNT=4');
  });
});
