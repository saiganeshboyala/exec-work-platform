import type { MeetingDto } from '@ewp/contracts';

import {
  inSchedulingZone,
  nowInSchedulingZone,
  sameDay,
  startOfDay,
} from '@/shared/lib/calendar';
import { formatTime } from '@/shared/lib/format';

const ROW_HEIGHT = 46;
const GUTTER = 58;
/** Meetings shorter than this still need to be readable. */
const MIN_BLOCK = 22;
/** Below this a block only has room for one line, so time and title share it. */
const STACKED_MIN = 34;

interface Placed {
  meeting: MeetingDto;
  top: number;
  height: number;
  /** Column index and count within a cluster of meetings that overlap. */
  slot: number;
  slots: number;
}

/**
 * Lays overlapping meetings out side by side. Anything that overlaps anything
 * already in a cluster joins that cluster, so a chain of part-overlaps still
 * ends up with columns that do not sit on top of each other.
 */
function place(dayMeetings: MeetingDto[], dayStart: Date, firstHour: number): Placed[] {
  // dayStart is a wall clock in the scheduling zone, so the meetings are read
  // as that same clock. Mixing the two would slide every block by the reader's
  // offset from Central.
  const startOf = (meeting: MeetingDto): number =>
    inSchedulingZone(new Date(meeting.startsAt)).getTime();
  const endOf = (meeting: MeetingDto): number =>
    inSchedulingZone(new Date(meeting.endsAt)).getTime();

  const sorted = [...dayMeetings].sort((a, b) => startOf(a) - startOf(b));

  const clusters: MeetingDto[][] = [];
  let current: MeetingDto[] = [];
  let clusterEnd = 0;

  for (const meeting of sorted) {
    const start = startOf(meeting);
    const end = endOf(meeting);

    if (current.length > 0 && start < clusterEnd) {
      current.push(meeting);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      if (current.length > 0) clusters.push(current);
      current = [meeting];
      clusterEnd = end;
    }
  }
  if (current.length > 0) clusters.push(current);

  const offset = dayStart.getTime() + firstHour * 3_600_000;

  return clusters.flatMap((cluster) =>
    cluster.map((meeting, index) => {
      const start = startOf(meeting);
      const end = endOf(meeting);

      return {
        meeting,
        top: ((start - offset) / 3_600_000) * ROW_HEIGHT,
        height: Math.max(((end - start) / 3_600_000) * ROW_HEIGHT, MIN_BLOCK),
        slot: index,
        slots: cluster.length,
      };
    }),
  );
}

/**
 * The day and week views. Both are the same grid - a column per day - so the
 * only difference is how many columns there are.
 */
export function TimeGridCalendar({
  days,
  meetings,
  selectedId,
  onSelect,
}: {
  days: Date[];
  meetings: MeetingDto[];
  selectedId?: string | null;
  onSelect: (meeting: MeetingDto) => void;
}) {
  const today = nowInSchedulingZone();

  // A fixed 9-to-5 window hides early and late meetings, so start from the
  // working day and widen to whatever is actually booked.
  const hours = meetings.flatMap((meeting) => {
    const start = inSchedulingZone(new Date(meeting.startsAt));
    const end = inSchedulingZone(new Date(meeting.endsAt));

    return [
      start.getUTCHours(),
      // A meeting ending exactly on the hour does not need the next row.
      end.getUTCMinutes() === 0 ? end.getUTCHours() - 1 : end.getUTCHours(),
    ];
  });

  const firstHour = Math.min(8, ...hours.filter((hour) => hour >= 0));
  const lastHour = Math.max(18, ...hours.filter((hour) => hour <= 23));
  const rows = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Day headings, aligned to the columns below by the same gutter. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${GUTTER}px repeat(${days.length}, 1fr)`,
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-sunk)',
        }}
      >
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            style={{
              padding: '7px 10px',
              textAlign: days.length === 1 ? 'left' : 'center',
              borderLeft: '1px solid var(--line)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--ink-muted)',
              }}
            >
              {new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(day)}
            </div>
            <div
              style={{
                display: 'inline-grid',
                placeItems: 'center',
                minWidth: 22,
                height: 22,
                marginTop: 2,
                padding: '0 6px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: sameDay(day, today) ? 600 : 400,
                background: sameDay(day, today) ? 'var(--accent)' : 'transparent',
                color: sameDay(day, today) ? '#fff' : 'var(--ink)',
              }}
            >
              {day.getUTCDate()}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${GUTTER}px repeat(${days.length}, 1fr)`,
          position: 'relative',
        }}
      >
        {/* Hour labels. */}
        <div>
          {rows.map((hour) => (
            <div
              key={hour}
              style={{
                height: ROW_HEIGHT,
                paddingRight: 8,
                textAlign: 'right',
                fontSize: 11,
                color: 'var(--ink-muted)',
                // Nudged so the label sits against the line it names.
                transform: 'translateY(-6px)',
              }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayStart = startOfDay(day);
          const dayMeetings = meetings.filter((meeting) =>
            sameDay(inSchedulingZone(new Date(meeting.startsAt)), day),
          );
          const placed = place(dayMeetings, dayStart, firstHour);

          return (
            <div
              key={day.toISOString()}
              style={{
                position: 'relative',
                borderLeft: '1px solid var(--line)',
                background: sameDay(day, today) ? 'var(--accent-wash)' : 'transparent',
              }}
            >
              {rows.map((hour) => (
                <div
                  key={hour}
                  style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--line)' }}
                />
              ))}

              {placed.map(({ meeting, top, height, slot, slots }) => {
                const isSelected = meeting.id === selectedId;
                const width = 100 / slots;
                // Under about half an hour there is only room for one line, and
                // stacking the time above the title clipped it mid-letter.
                const compact = height < STACKED_MIN;
                const time = formatTime(meeting.startsAt);

                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onSelect(meeting)}
                    title={`${meeting.title} · ${time}`}
                    aria-current={isSelected ? 'true' : undefined}
                    style={{
                      position: 'absolute',
                      top,
                      height,
                      left: `calc(${slot * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      textAlign: 'left',
                      border: 'none',
                      borderLeft: `3px solid ${meeting.joinUrl ? 'var(--on-track)' : 'var(--accent)'}`,
                      borderRadius: 4,
                      background: meeting.joinUrl ? 'var(--on-track-wash)' : 'var(--accent-wash)',
                      color: 'var(--ink)',
                      padding: '2px 5px',
                      fontSize: 11,
                      lineHeight: 1.3,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      outline: isSelected ? '2px solid var(--accent)' : 'none',
                      outlineOffset: 1,
                      fontWeight: isSelected ? 600 : 400,
                      ...(compact
                        ? { display: 'flex', gap: 4, alignItems: 'baseline', whiteSpace: 'nowrap' }
                        : {}),
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--ink-secondary)',
                        ...(compact ? { flexShrink: 0 } : { display: 'block' }),
                      }}
                    >
                      {time}
                    </span>
                    <span
                      style={
                        compact
                          ? { overflow: 'hidden', textOverflow: 'ellipsis' }
                          : { display: 'block', overflow: 'hidden' }
                      }
                    >
                      {meeting.title}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {meetings.length === 0 ? (
        <p className="meta" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          Nothing scheduled in this {days.length === 1 ? 'day' : 'week'}.
        </p>
      ) : null}
    </div>
  );
}
