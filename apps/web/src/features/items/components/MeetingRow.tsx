import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { meetingsApi } from '@/features/meetings';
import { CopyButton } from '@/shared/components/CopyButton';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { CalendarIcon } from '@/shared/components/icons';
import { browserTimeZone } from '@/shared/lib/calendar';
import { formatDateTime } from '@/shared/lib/format';

/** A datetime-local value from an ISO string, in the reader's own timezone. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * The next meeting about this task, and what you can do to it. Only the next
 * one: a repeating series is dozens of identical rows, and reading them was
 * never the point - the questions are "when is the next" and "how do I stop
 * them", which the count and Cancel all answer between them.
 *
 * Rescheduling patches the existing calendar event, so the link people already
 * hold keeps working.
 */
export function MeetingRow({
  itemId,
  canEdit,
  onSchedule,
}: {
  itemId: string;
  canEdit: boolean;
  onSchedule?: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const meetings = useQuery({
    queryKey: ['meetings', 'item', itemId],
    queryFn: () => meetingsApi.listForItem(itemId),
  });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['meetings'] });
    await queryClient.invalidateQueries({ queryKey: ['items'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const reschedule = useMutation({
    mutationFn: (id: string) => {
      const start = new Date(startsAt);
      return meetingsApi.reschedule(id, {
        startsAt: start,
        endsAt: new Date(start.getTime() + minutes * 60_000),
        timeZone: browserTimeZone(),
      });
    },
    onSuccess: async () => {
      setEditing(false);
      await refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => meetingsApi.cancel(id),
    onSuccess: refresh,
  });

  const cancelAll = useMutation({
    mutationFn: async (meetings: Array<{ id: string; seriesId: string | null }>) => {
      // A repeat is one recurring event in the calendar, so the series endpoint
      // calls it off with a single notice. Cancelling them one by one would
      // email every attendee once per occurrence.
      const series = new Set(
        meetings.map((meeting) => meeting.seriesId).filter((id): id is string => id !== null),
      );

      for (const seriesId of series) {
        const first = meetings.find((meeting) => meeting.seriesId === seriesId);
        if (first) await meetingsApi.cancelSeries(first.id);
      }

      for (const meeting of meetings.filter((m) => m.seriesId === null)) {
        await meetingsApi.cancel(meeting.id);
      }
    },
    onSuccess: async () => {
      setConfirmingAll(false);
      await refresh();
    },
  });

  if (meetings.isPending) return <span className="meta">Loading…</span>;
  if (meetings.error) return <ErrorNotice error={meetings.error} />;

  // Past meetings happened; they are not something to join, move or call off.
  const upcoming = [...meetings.data]
    .filter((meeting) => new Date(meeting.startsAt) >= new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const next = upcoming[0];

  if (!next) {
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
            onClick={() => reschedule.mutate(next.id)}
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
        <span style={{ fontSize: 'var(--text-md)' }}>{formatDateTime(next.startsAt)}</span>

        {next.joinUrl ? (
          <>
            <a
              className="badge"
              href={next.joinUrl}
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
            <CopyButton value={next.joinUrl} />
          </>
        ) : (
          <span className="meta">No join link</span>
        )}

        {canEdit ? (
          <>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setStartsAt(toLocalInput(next.startsAt));
                setMinutes(
                  Math.max(
                    5,
                    Math.round(
                      (new Date(next.endsAt).getTime() - new Date(next.startsAt).getTime()) / 60_000,
                    ),
                  ),
                );
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              className="btn btn--ghost btn--sm"
              style={{ color: 'var(--blocked)' }}
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(next.id)}
            >
              Cancel
            </button>
          </>
        ) : null}
      </div>

      <span className="meta">
        {next.title}
        {/* Says there are more without listing them. */}
        {upcoming.length > 1 ? ` · ${upcoming.length - 1} more after this` : ''}
      </span>

      {cancel.error ? <ErrorNotice error={cancel.error} /> : null}

      {canEdit && upcoming.length > 1 ? (
        confirmingAll ? (
          <div
            role="alert"
            className="stack"
            style={{
              gap: 6,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--blocked)',
              background: 'var(--blocked-wash)',
            }}
          >
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--blocked)', fontWeight: 600 }}>
              Cancel all {upcoming.length} upcoming meetings?
            </p>
            <p className="meta">Everyone invited is told. Ones already held are left alone.</p>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <button
                className="btn btn--sm"
                disabled={cancelAll.isPending}
                style={{ borderColor: 'var(--blocked)', color: 'var(--blocked)' }}
                onClick={() =>
                  cancelAll.mutate(
                    upcoming.map((meeting) => ({ id: meeting.id, seriesId: meeting.seriesId })),
                  )
                }
              >
                {cancelAll.isPending ? 'Cancelling…' : 'Yes, cancel them'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirmingAll(false)}>
                Keep them
              </button>
            </div>
            {cancelAll.error ? <ErrorNotice error={cancelAll.error} /> : null}
          </div>
        ) : (
          <button
            className="btn btn--ghost btn--sm"
            style={{ alignSelf: 'flex-start', color: 'var(--blocked)' }}
            onClick={() => setConfirmingAll(true)}
          >
            Cancel all {upcoming.length} upcoming
          </button>
        )
      ) : null}

      {canEdit && onSchedule ? (
        <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={onSchedule}>
          <CalendarIcon /> Schedule another
        </button>
      ) : null}
    </div>
  );
}
