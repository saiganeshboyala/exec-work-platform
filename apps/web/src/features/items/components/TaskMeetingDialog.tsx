import type { ItemDto, MemberDto, RepeatInput, WorkspaceDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { AttendeePicker, meetingsApi, RepeatPicker } from '@/features/meetings';
import { ApiError } from '@/shared/api/http-client';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { WarningIcon } from '@/shared/components/icons';
import {
  defaultSchedulingStart,
  SCHEDULING_TIME_ZONE,
  schedulingInputToDate,
  schedulingZoneLabel,
} from '@/shared/lib/calendar';
import { formatDateTime } from '@/shared/lib/format';

/**
 * Schedules a meeting about one specific task. The task goes on the agenda and
 * the people already on it are invited, because that is almost always who the
 * meeting is for. Clashes are surfaced as a warning, never a block: sometimes
 * you genuinely do need to pull someone out of another meeting.
 */
export function TaskMeetingDialog({
  item,
  members,
  workspaces,
  onClose,
}: {
  item: ItemDto;
  members: MemberDto[];
  workspaces: WorkspaceDto[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(`Review: ${item.title}`.slice(0, 200));
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [startsAt, setStartsAt] = useState(defaultSchedulingStart);
  const [minutes, setMinutes] = useState(30);
  const [joinUrl, setJoinUrl] = useState('');

  // When Google Calendar is connected it issues its own Meet link, so asking
  // for one here would only invite a value the server is going to overwrite.
  const calendar = useQuery({ queryKey: ['calendar-status'], queryFn: meetingsApi.calendarStatus });
  const calendarConnected = calendar.data?.connected ?? false;

  // Everyone already on the task, owner first.
  const [attendeeIds, setAttendeeIds] = useState<string[]>(() => {
    const ids = [item.owner?.id, ...item.assignees.map((person) => person.id)].filter(
      (id): id is string => Boolean(id),
    );
    return [...new Set(ids)];
  });

  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<RepeatInput | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const endsAt = useMemo(
    () => new Date(schedulingInputToDate(startsAt).getTime() + minutes * 60_000),
    [startsAt, minutes],
  );

  const validWindow = !Number.isNaN(schedulingInputToDate(startsAt).getTime()) && minutes > 0;

  const conflicts = useQuery({
    queryKey: ['meeting-conflicts', startsAt, minutes, attendeeIds.join(',')],
    queryFn: () => meetingsApi.conflicts(schedulingInputToDate(startsAt), endsAt, attendeeIds),
    enabled: validWindow && attendeeIds.length > 0,
    // Re-checking on every keystroke of the time field would hammer the API.
    staleTime: 5_000,
  });

  const schedule = useMutation({
    mutationFn: () =>
      meetingsApi.schedule({
        workspaceId,
        title: title.trim(),
        startsAt: schedulingInputToDate(startsAt),
        endsAt,
        attendeeIds,
        itemIds: [item.id],
        ...(joinUrl.trim() !== '' ? { joinUrl: joinUrl.trim() } : {}),
        ...(repeat ? { repeat } : {}),
        timeZone: SCHEDULING_TIME_ZONE,
      }),
    onSuccess: async (meeting) => {
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      await queryClient.invalidateQueries({ queryKey: ['items'] });

      // The meeting was saved either way. When the calendar could not mint a
      // link, stay open and say why - closing would hide the one explanation
      // the person is going to want.
      if (meeting.calendarWarning) {
        setCalendarWarning(meeting.calendarWarning);
        return;
      }
      onClose();
    },
  });

  const toggle = (userId: string): void =>
    setAttendeeIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );

  const clashes = conflicts.data ?? [];

  // Everyone the conflict check says is already booked in this window.
  const busyIds = new Set(
    clashes.flatMap((clash) => clash.clashingAttendees.map((person) => person.id)),
  );

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, background: 'rgba(13, 27, 62, 0.4)', zIndex: 80 }}
      />

      <div
        role="dialog"
        aria-label={`Schedule a meeting about ${item.title}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 81,
          padding: 'var(--space-5)',
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 550 }}>Schedule a meeting</h2>
            <p className="meta">About: {item.title}</p>
          </div>
          <button className="btn btn--ghost btn--sm btn--icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          <div className="field">
            <label className="field__label" htmlFor="tm-title">Title</label>
            <input
              id="tm-title"
              className="field__input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="tm-start">
                Starts <span className="meta">({schedulingZoneLabel()})</span>
              </label>
              <input
                id="tm-start"
                className="field__input"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="field__label" htmlFor="tm-mins">Minutes</label>
              <input
                id="tm-mins"
                className="field__input"
                type="number"
                min={5}
                step={5}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
              />
            </div>
          </div>

          {workspaces.length > 1 ? (
            <div className="field">
              <label className="field__label" htmlFor="tm-ws">Workspace</label>
              <select
                id="tm-ws"
                className="field__input"
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="field">
            <label className="field__label" htmlFor="tm-link">Join link</label>
            <input
              id="tm-link"
              className="field__input"
              type="url"
              value={joinUrl}
              disabled={calendarConnected}
              placeholder={
                calendarConnected
                  ? 'Google Meet link is created automatically'
                  : 'Paste a Zoom / Teams / Meet link'
              }
              onChange={(event) => setJoinUrl(event.target.value)}
            />
            {!calendarConnected ? (
              <p className="meta">
                No calendar is connected, so no link is generated for you. Paste one here, or
                connect Google Calendar on the Meetings page to get Meet links automatically.
              </p>
            ) : null}
          </div>

          <div className="field">
            <span className="field__label">Attendees</span>
            <AttendeePicker
              members={members}
              selected={attendeeIds}
              busyIds={busyIds}
              onToggle={toggle}
            />
          </div>

          <div className="field">
            <span className="field__label">Repeats</span>
            <RepeatPicker value={repeat} onChange={setRepeat} />
          </div>

          {conflicts.isFetching ? (
            <p className="meta">Checking everyone's diary…</p>
          ) : clashes.length > 0 ? (
            <div
              role="alert"
              className="card"
              style={{
                background: 'var(--at-risk-wash)',
                borderColor: 'var(--at-risk)',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <p
                className="row"
                style={{ color: 'var(--at-risk)', fontWeight: 600, fontSize: 'var(--text-md)', gap: 6 }}
              >
                <WarningIcon /> {clashes.length === 1 ? 'This clashes with another meeting' : `This clashes with ${clashes.length} other meetings`}
              </p>

              <ul style={{ listStyle: 'none', margin: 'var(--space-2) 0 0', padding: 0 }}>
                {clashes.map((clash) => (
                  <li key={clash.meetingId} style={{ fontSize: 'var(--text-base)', marginTop: 4 }}>
                    <strong>{clash.title}</strong> · {formatDateTime(clash.startsAt)}
                    <span className="meta" style={{ display: 'block' }}>
                      {clash.clashingAttendees.map((person) => person.fullName).join(', ')} already booked
                    </span>
                  </li>
                ))}
              </ul>

              <p className="meta" style={{ marginTop: 'var(--space-2)' }}>
                You can still schedule it — change the time above if you would rather not double-book.
              </p>
            </div>
          ) : attendeeIds.length > 0 && validWindow ? (
            <p className="meta" style={{ color: 'var(--on-track)' }}>
              Everyone is free then.
            </p>
          ) : null}

          {schedule.error ? (
            <ErrorNotice error={schedule.error} />
          ) : null}
          {schedule.error instanceof ApiError && schedule.error.fieldErrors.attendeeIds ? (
            <p className="field__error">{schedule.error.fieldErrors.attendeeIds}</p>
          ) : null}

          {calendarWarning ? (
            <div
              role="alert"
              className="stack"
              style={{
                gap: 6,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--at-risk)',
                background: 'var(--at-risk-wash)',
              }}
            >
              <p style={{ fontWeight: 600, color: 'var(--at-risk)' }}>
                <WarningIcon /> Meeting saved, but without a join link
              </p>
              <p style={{ fontSize: 'var(--text-md)' }}>{calendarWarning}</p>
              <p className="meta">
                You can still add a link yourself: open the meeting and paste one in.
              </p>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            {calendarWarning ? (
              <button className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            ) : (
              <>
                <button className="btn" onClick={onClose}>Cancel</button>
                <button
                  className="btn btn--primary"
                  disabled={
                    schedule.isPending ||
                    attendeeIds.length === 0 ||
                    title.trim() === '' ||
                    !validWindow
                  }
                  onClick={() => schedule.mutate()}
                >
                  {schedule.isPending
                    ? 'Scheduling…'
                    : clashes.length > 0
                      ? 'Schedule anyway'
                      : 'Schedule'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
