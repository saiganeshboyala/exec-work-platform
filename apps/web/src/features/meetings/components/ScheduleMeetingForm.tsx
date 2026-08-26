import type { MemberDto, WorkspaceDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { boardsApi } from '@/features/boards';
import { ApiError } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';

import { meetingsApi } from '../api/meetings.api';

/** Defaults to the next whole hour, which is what people usually mean. */
function defaultStart(): string {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  // datetime-local wants local time without a zone suffix.
  const offset = start.getTimezoneOffset() * 60_000;
  return new Date(start.getTime() - offset).toISOString().slice(0, 16);
}

export function ScheduleMeetingForm({
  workspaces,
  members,
  calendarConnected,
  onScheduled,
}: {
  workspaces: WorkspaceDto[];
  members: MemberDto[];
  calendarConnected: boolean;
  onScheduled: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [minutes, setMinutes] = useState(30);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  // A meeting raised here has no task behind it, so one is created by default.
  const [trackAsTask, setTrackAsTask] = useState(true);
  const [taskBoardId, setTaskBoardId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // The tracking task lives on a board in the meeting's own workspace.
  const boards = useQuery({
    queryKey: queryKeys.boards(workspaceId),
    queryFn: () => boardsApi.list(workspaceId),
    enabled: workspaceId !== '',
  });

  const schedule = useMutation({
    mutationFn: () => {
      const start = new Date(startsAt);
      return meetingsApi.schedule({
        workspaceId,
        title,
        startsAt: start,
        endsAt: new Date(start.getTime() + minutes * 60_000),
        attendeeIds,
        itemIds: [],
        ...(joinUrl.trim() !== '' ? { joinUrl: joinUrl.trim() } : {}),
        ...(trackAsTask && taskBoardId !== '' ? { createTaskOnBoardId: taskBoardId } : {}),
      });
    },
    onSuccess: async () => {
      setTitle('');
      setJoinUrl('');
      setAttendeeIds([]);
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      onScheduled();
    },
    onError: (error) => setFieldErrors(error instanceof ApiError ? error.fieldErrors : {}),
  });

  const toggle = (userId: string): void =>
    setAttendeeIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );

  return (
    <form
      className="card stack"
      onSubmit={(event) => {
        event.preventDefault();
        schedule.mutate();
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 500 }}>Schedule a meeting</h2>

      <div className="field">
        <label className="field__label" htmlFor="meeting-title">Title</label>
        <input
          id="meeting-title"
          className="field__input"
          value={title}
          required
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Weekly portfolio review"
        />
        {fieldErrors.title ? <p className="meta" style={{ color: 'var(--blocked)' }}>{fieldErrors.title}</p> : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="meeting-workspace">Workspace</label>
        <select
          id="meeting-workspace"
          className="field__input"
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="field__label" htmlFor="meeting-start">Starts</label>
          <input
            id="meeting-start"
            className="field__input"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>
        <div className="field" style={{ width: 120 }}>
          <label className="field__label" htmlFor="meeting-length">Minutes</label>
          <input
            id="meeting-length"
            className="field__input"
            type="number"
            min={5}
            step={5}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <span className="field__label">Attendees</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {members.map((member) => (
            <label
              key={member.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 13,
                padding: '4px 8px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: attendeeIds.includes(member.userId) ? 'var(--accent-wash)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={attendeeIds.includes(member.userId)}
                onChange={() => toggle(member.userId)}
              />
              {member.fullName}
            </label>
          ))}
        </div>
        {fieldErrors.attendeeIds ? (
          <p className="meta" style={{ color: 'var(--blocked)' }}>{fieldErrors.attendeeIds}</p>
        ) : null}
      </div>

      <div className="field">
        <label className="row" style={{ gap: 6, fontSize: 'var(--text-md)' }}>
          <input
            type="checkbox"
            checked={trackAsTask}
            onChange={(event) => setTrackAsTask(event.target.checked)}
          />
          Also create a task to track this meeting
        </label>

        {trackAsTask ? (
          <select
            className="field__input"
            aria-label="Board for the tracking task"
            value={taskBoardId}
            onChange={(event) => setTaskBoardId(event.target.value)}
            style={{ marginTop: 'var(--space-2)' }}
          >
            <option value="">Choose a board…</option>
            {boards.data?.map((board) => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="meeting-link">Join link</label>
        <input
          id="meeting-link"
          className="field__input"
          type="url"
          value={joinUrl}
          disabled={calendarConnected}
          placeholder={
            calendarConnected
              ? 'Google Meet link is created automatically'
              : 'https://meet.google.com/… or any conferencing link'
          }
          onChange={(event) => setJoinUrl(event.target.value)}
        />
      </div>

      <button className="btn btn--primary" type="submit" disabled={schedule.isPending || attendeeIds.length === 0}>
        {schedule.isPending ? 'Scheduling…' : 'Schedule'}
      </button>

      {schedule.error ? <ErrorNotice error={schedule.error} /> : null}
    </form>
  );
}
