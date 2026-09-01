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
 */
describe('the calendar runs on the scheduling zone', () => {
  it('stays CST in summer as well as winter', () => {
    expect(schedulingZoneLabel(new Date('2026-01-15T18:00:00Z'))).toBe('CST');
    expect(schedulingZoneLabel(new Date('2026-07-15T18:00:00Z'))).toBe('CST');
  });

  it('reads an instant as the clock Central would show', () => {
    // 15:00Z is 09:00 at UTC-6.
    const wall = inSchedulingZone(new Date('2026-09-15T15:00:00Z'));

    expect(wall.getUTCFullYear()).toBe(2026);
    expect(wall.getUTCMonth()).toBe(8);
    expect(wall.getUTCDate()).toBe(15);
    expect(wall.getUTCHours()).toBe(9);
  });

  it('keeps a late meeting on the day Central calls it', () => {
    // 21:00 on the 15th in Central is already the 16th in UTC, and the 16th
    // for a browser in London. It belongs in the 15th's cell.
    const late = new Date('2026-09-16T03:00:00Z');
    const fifteenth = new Date(Date.UTC(2026, 8, 15));
    const sixteenth = new Date(Date.UTC(2026, 8, 16));

    expect(sameDay(inSchedulingZone(late), fifteenth)).toBe(true);
    expect(sameDay(inSchedulingZone(late), sixteenth)).toBe(false);
  });

  it('fetches exactly the Central day, midnight to midnight', () => {
    const [from, to] = rangeFor('day', new Date(Date.UTC(2026, 8, 15)));

    expect(from.toISOString()).toBe('2026-09-15T06:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-16T05:59:59.999Z');
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

  it('round-trips what somebody types in the form', () => {
    const typed = '2026-09-15T09:00';
    const instant = schedulingInputToDate(typed);

    // Nine in the morning Central is 15:00Z, not nine wherever the typist sits.
    expect(instant.toISOString()).toBe('2026-09-15T15:00:00.000Z');
    expect(dateToSchedulingInput(instant)).toBe(typed);
  });
});
