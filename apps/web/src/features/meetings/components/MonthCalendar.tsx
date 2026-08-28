import type { MeetingDto } from '@ewp/contracts';

import { monthGrid, sameDay } from '@/shared/lib/calendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthCalendar({
  anchor,
  meetings,
  selectedId,
  onSelect,
}: {
  anchor: Date;
  meetings: MeetingDto[];
  selectedId?: string | null;
  onSelect: (meeting: MeetingDto) => void;
}) {
  const days = monthGrid(anchor);
  const today = new Date();

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            style={{
              padding: '8px 10px',
              background: 'var(--surface-sunk)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-muted)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayMeetings = meetings.filter((meeting) => sameDay(new Date(meeting.startsAt), day));

          return (
            <div
              key={day.toISOString()}
              style={{
                // Six of these plus the weekday header have to fit a laptop
                // screen without scrolling; 96 put the last week below the fold.
                minHeight: 72,
                // A grid item will not shrink below its widest unbreakable
                // child, and the chips do not wrap. Without this, one long
                // meeting title widens its column and pushes the last days of
                // the week off the screen.
                minWidth: 0,
                padding: 5,
                borderBottom: '1px solid var(--line)',
                borderRight: '1px solid var(--line)',
                background: inMonth ? 'var(--surface)' : 'var(--paper)',
                opacity: inMonth ? 1 : 0.55,
              }}
            >
              <span
                style={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: sameDay(day, today) ? 600 : 400,
                  background: sameDay(day, today) ? 'var(--accent)' : 'transparent',
                  color: sameDay(day, today) ? '#fff' : 'var(--ink-secondary)',
                }}
              >
                {day.getDate()}
              </span>

              {/* A busy day scrolls inside its own cell rather than stretching
                  the whole week row and pushing the rest of the month down. */}
              <div
                style={{
                  marginTop: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0,
                  maxHeight: 44,
                  overflowY: 'auto',
                }}
              >
                {dayMeetings.map((meeting) => {
                  const isSelected = meeting.id === selectedId;

                  return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onSelect(meeting)}
                    title={meeting.title}
                    aria-current={isSelected ? 'true' : undefined}
                    style={{
                      textAlign: 'left',
                      border: 'none',
                      borderLeft: `3px solid ${meeting.joinUrl ? 'var(--on-track)' : 'var(--accent)'}`,
                      borderRadius: 3,
                      background: meeting.joinUrl ? 'var(--on-track-wash)' : 'var(--accent-wash)',
                      color: 'var(--ink)',
                      padding: '2px 5px',
                      fontSize: 11,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      // Ellipsis only happens once the chip is allowed to be
                      // narrower than its text.
                      maxWidth: '100%',
                      minWidth: 0,
                      // Arriving from a task, the meeting has to be findable.
                      outline: isSelected ? '2px solid var(--accent)' : 'none',
                      outlineOffset: 1,
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(
                      new Date(meeting.startsAt),
                    )}{' '}
                    {meeting.title}
                  </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
