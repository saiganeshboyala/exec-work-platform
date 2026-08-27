/** Calendar maths, kept out of the component so fast refresh stays happy. */

/**
 * Monday-first grid covering the whole month, padded to six complete weeks so
 * the grid never changes height as you page through months.
 */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // getDay() is Sunday-based; shift so Monday is 0.
  const lead = (first.getDay() + 6) % 7;

  const start = new Date(first);
  start.setDate(first.getDate() - lead);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/** Monday-first week containing the anchor. */
export function weekGrid(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * The window a view needs to fetch. Kept beside the grid maths so the range
 * queried and the range drawn can never drift apart.
 */
export function rangeFor(view: 'day' | 'week' | 'month', anchor: Date): [Date, Date] {
  if (view === 'day') return [startOfDay(anchor), endOfDay(anchor)];

  const days = view === 'week' ? weekGrid(anchor) : monthGrid(anchor);
  return [startOfDay(days[0] as Date), endOfDay(days[days.length - 1] as Date)];
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
