import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { meetingsApi } from '@/features/meetings';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { CalendarIcon } from '@/shared/components/icons';
import { formatDateTime } from '@/shared/lib/format';

interface NextMeeting {
  id: string;
  title: string;
  startsAt: string;
  joinUrl: string | null;
}

/** A datetime-local value from an ISO string, in the reader's own timezone. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * The meeting booked about this task: when it is, how to join, and a way to
 * move it. Rescheduling patches the existing calendar event rather than making
 * a new one, so the link people already have keeps working.
 */
export function MeetingRow({
  meeting,
  canEdit,
  onSchedule,
}: {
  meeting: NextMeeting | null;
  canEdit: boolean;
  onSchedule?: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [minutes, setMinutes] = useState(30);

  const reschedule = useMutation({
    mutationFn: () => {
      const start = new Date(startsAt);
      return meetingsApi.reschedule(meeting?.id as string, {
        startsAt: start,
        endsAt: new Date(start.getTime() + minutes * 60_000),
      });
    },
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (!meeting) {
    return (
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <span className="meta">No meeting scheduled</span>
        {canEdit && onSchedule ? (
          <button className="btn btn--sm" onClick={onSchedule}>
            <CalendarIcon /> Schedule
          </button>
        ) : null}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input
            className="field__input"
            type="datetime-local"
            aria-label="New meeting time"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <input
            className="field__input"
            type="number"
            min={5}
            step={5}
            aria-label="Minutes"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            style={{ width: 84 }}
          />
          <button
            className="btn btn--primary btn--sm"
            disabled={startsAt === '' || minutes <= 0 || reschedule.isPending}
            onClick={() => reschedule.mutate()}
          >
            {reschedule.isPending ? 'Moving…' : 'Move it'}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
        <p className="meta">Everyone invited is told. The join link does not change.</p>
        {reschedule.error ? <ErrorNotice error={reschedule.error} /> : null}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--text-md)' }}>{formatDateTime(meeting.startsAt)}</span>

        {meeting.joinUrl ? (
          <a
            className="badge"
            href={meeting.joinUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'var(--on-track-wash)',
              color: 'var(--on-track)',
              textDecoration: 'none',
              gap: 4,
            }}
          >
            <CalendarIcon size={11} /> Join
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="meta">No join link</span>
        )}

        {canEdit ? (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setStartsAt(toLocalInput(meeting.startsAt));
              setEditing(true);
            }}
          >
            Reschedule
          </button>
        ) : null}
      </div>

      <span className="meta">{meeting.title}</span>
    </div>
  );
}
