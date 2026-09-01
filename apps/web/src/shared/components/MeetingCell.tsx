import { Link } from 'react-router-dom';

import { CalendarIcon } from '@/shared/components/icons';
import { SCHEDULING_TIME_ZONE } from '@/shared/lib/calendar';
import { formatDateTime } from '@/shared/lib/format';

interface NextMeeting {
  id: string;
  title: string;
  startsAt: string;
  joinUrl: string | null;
}

/**
 * Says whether a task has a meeting booked, and when. Under its own "Meeting"
 * heading rather than beside the due date - two bare dates side by side read as
 * one thing, and nobody could tell which was which.
 *
 * Clicking joins the call when there is a link, because that is what somebody
 * looking at this actually wants to do. Without one it opens the meeting in the
 * calendar instead, so the cell is never a dead end.
 */
export function MeetingCell({ meeting }: { meeting: NextMeeting | null }) {
  if (!meeting) {
    return (
      <span className="meta" style={{ fontSize: 'var(--text-base)' }}>
        —
      </span>
    );
  }

  const when = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SCHEDULING_TIME_ZONE,
  }).format(new Date(meeting.startsAt));

  const style = {
    background: meeting.joinUrl ? 'var(--on-track-wash)' : 'var(--accent-wash)',
    color: meeting.joinUrl ? 'var(--on-track)' : 'var(--accent)',
    gap: 4,
    padding: '2px 8px',
    maxWidth: '100%',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    justifySelf: 'start',
  } as const;

  if (meeting.joinUrl) {
    return (
      <a
        className="badge"
        href={meeting.joinUrl}
        target="_blank"
        rel="noreferrer"
        title={`Join ${meeting.title} · ${formatDateTime(meeting.startsAt)}`}
        aria-label={`Join ${meeting.title} on ${formatDateTime(meeting.startsAt)}`}
        style={style}
      >
        <CalendarIcon size={11} />
        {when}
        <span aria-hidden="true" style={{ fontSize: 9, opacity: 0.75 }}>
          ↗
        </span>
      </a>
    );
  }

  return (
    <Link
      className="badge"
      to={`/meetings?meeting=${meeting.id}`}
      title={`${meeting.title} · ${formatDateTime(meeting.startsAt)} — no join link yet, open in the calendar`}
      aria-label={`${meeting.title} on ${formatDateTime(meeting.startsAt)}. No join link; open it in the calendar.`}
      style={style}
    >
      <CalendarIcon size={11} />
      {when}
    </Link>
  );
}
