import { describe, expect, it } from 'vitest';

import {
  dateToSchedulingInput,
  inSchedulingZone,
  monthGrid,
  rangeFor,
  sameDay,
  schedulingInputToDate,
  schedulingZoneLabel,
  weekGrid,
} from './calendar';

/**
 * None of these may depend on the machine's own clock: the whole point of the
 * zone work is that a colleague in London and one in Dallas see one calendar.
 *
 * September is daylight saving in Central (UTC-5); January is not (UTC-6). Both
 * appear below, because a fixed offset passed the summer cases by accident and
 * still had the app reading an hour behind the wall clock.
 */
describe('the calendar runs on the scheduling zone', () => {
  it('is called Central, whatever the season', () => {
    expect(schedulingZoneLabel()).toBe('Central');
  });

  it('reads an instant as the clock Central would show, in both halves of the year', () => {
    const summer = inSchedulingZone(new Date('2026-09-15T14:00:00Z'));
    const winter = inSchedulingZone(new Date('2026-01-15T15:00:00Z'));

    expect(summer.getUTCDate()).toBe(15);
    expect(summer.getUTCHours()).toBe(9);
    expect(winter.getUTCHours()).toBe(9);
  });

  it('keeps a late meeting on the day Central calls it', () => {
    // 21:00 on the 15th in Central is already the 16th in UTC, and the 16th
    // for a browser in London. It belongs in the 15th's cell.
    const late = new Date('2026-09-16T02:00:00Z');
    const fifteenth = new Date(Date.UTC(2026, 8, 15));
    const sixteenth = new Date(Date.UTC(2026, 8, 16));

    expect(sameDay(inSchedulingZone(late), fifteenth)).toBe(true);
    expect(sameDay(inSchedulingZone(late), sixteenth)).toBe(false);
  });

  it('fetches exactly the Central day, midnight to midnight', () => {
    const [from, to] = rangeFor('day', new Date(Date.UTC(2026, 8, 15)));

    expect(from.toISOString()).toBe('2026-09-15T05:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-16T04:59:59.999Z');
  });

  it('shifts that window by an hour in winter, as the clocks do', () => {
    const [from] = rangeFor('day', new Date(Date.UTC(2026, 0, 15)));

    expect(from.toISOString()).toBe('2026-01-15T06:00:00.000Z');
  });

  it('draws six Monday-first weeks whatever the month', () => {
    const days = monthGrid(new Date(Date.UTC(2026, 8, 15)));

    expect(days).toHaveLength(42);
    expect(days[0]?.getUTCDay()).toBe(1);
    // The first row must reach into the month it is labelled with.
    expect(days.slice(0, 7).some((day) => day.getUTCMonth() === 8)).toBe(true);
  });

  it('starts the week on Monday', () => {
    // A Thursday.
    const week = weekGrid(new Date(Date.UTC(2026, 8, 17)));

    expect(week).toHaveLength(7);
    expect(week[0]?.getUTCDay()).toBe(1);
    expect(week[0]?.getUTCDate()).toBe(14);
    expect(week[6]?.getUTCDate()).toBe(20);
  });

  it('books the hour somebody typed, not an hour either side of it', () => {
    // The bug this pins: under a fixed -6, a September 09:00 was stored as
    // 15:00Z and went out in the invitation as 10:00 Central.
    expect(schedulingInputToDate('2026-09-15T09:00').toISOString()).toBe(
      '2026-09-15T14:00:00.000Z',
    );
    expect(schedulingInputToDate('2026-01-15T09:00').toISOString()).toBe(
      '2026-01-15T15:00:00.000Z',
    );
  });

  it('round-trips what somebody types in the form', () => {
    const typed = '2026-09-15T09:00';

    expect(dateToSchedulingInput(schedulingInputToDate(typed))).toBe(typed);
  });
});
