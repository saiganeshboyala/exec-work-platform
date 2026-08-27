import { CalendarIcon } from '@/shared/components/icons';
import { formatDateTime } from '@/shared/lib/format';

/**
 * Says whether a task has a meeting booked, and when. Lives under its own
 * "Meeting" heading rather than beside the due date - two bare dates side by
 * side read as one thing, and nobody could tell which was which.
 */
export function MeetingCell({
  meeting,
}: {
  meeting: { id: string; title: string; startsAt: string } | null;
}) {
  if (!meeting) {
    return (
      <span className="meta" style={{ fontSize: 'var(--text-base)' }}>
        —
      </span>
    );
  }

  const when = new Date(meeting.startsAt);

  return (
    <span
      className="badge"
      title={`${meeting.title} · ${formatDateTime(meeting.startsAt)}`}
      aria-label={`Meeting scheduled: ${meeting.title} on ${formatDateTime(meeting.startsAt)}`}
      style={{
        background: 'var(--accent-wash)',
        color: 'var(--accent)',
        gap: 4,
        padding: '2px 8px',
        maxWidth: '100%',
        whiteSpace: 'nowrap',
      }}
    >
      <CalendarIcon size={11} />
      {new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(when)}
    </span>
  );
}
