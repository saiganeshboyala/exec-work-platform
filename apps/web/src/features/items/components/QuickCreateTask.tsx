import { ITEM_STATUSES, PRIORITIES, type ItemStatus, type Priority } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { boardsApi } from '@/features/boards';
import { AttendeePicker, meetingsApi } from '@/features/meetings';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PRIORITY_TONE, STATUS_TONE } from '@/shared/lib/item-meta';

import { itemsApi } from '../api/items.api';

/** Next whole hour, in the format datetime-local expects. */
function nextHour(): string {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return new Date(start.getTime() - start.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * Creates a task from anywhere, without first navigating to the right board.
 * The board picker is the only field that has no sensible default, so it is
 * the one thing asked for beyond a title.
 */
export function QuickCreateTask({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  // A meeting needs at least one attendee, and whoever is creating the task is
  // the sensible fallback when nobody has been picked.
  const currentUserId = user?.id ?? '';

  const [workspaceId, setWorkspaceId] = useState('');
  const [boardId, setBoardId] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ItemStatus>('NOT_STARTED');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openAfter, setOpenAfter] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  // A task often exists because a meeting is needed about it, so offer both in
  // one go rather than making people create the task and come back.
  const [withMeeting, setWithMeeting] = useState(false);
  const [meetingAt, setMeetingAt] = useState('');
  const [meetingMinutes, setMeetingMinutes] = useState(30);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState('');
  const [addingDepartment, setAddingDepartment] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const workspaces = useQuery({ queryKey: queryKeys.workspaces, queryFn: boardsApi.listWorkspaces });
  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });

  // Default to the first workspace so the form is usable immediately.
  useEffect(() => {
    if (workspaceId === '' && workspaces.data?.[0]) setWorkspaceId(workspaces.data[0].id);
  }, [workspaces.data, workspaceId]);

  const boards = useQuery({
    queryKey: queryKeys.boards(workspaceId),
    queryFn: () => boardsApi.list(workspaceId),
    enabled: workspaceId !== '',
  });

  // Changing workspace invalidates the chosen board.
  useEffect(() => {
    setBoardId((current) =>
      boards.data?.some((board) => board.id === current) ? current : (boards.data?.[0]?.id ?? ''),
    );
  }, [boards.data]);

  // Creating a department here saves leaving the dialog just to make somewhere
  // for the task to live.
  const createDepartment = useMutation({
    mutationFn: () => boardsApi.create({ workspaceId, name: newDepartment.trim(), isPortfolio: false }),
    onSuccess: async (board) => {
      setNewDepartment('');
      setAddingDepartment(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.boards(workspaceId) });
      setBoardId(board.id);
    },
  });

  const create = useMutation({
    mutationFn: () =>
      itemsApi.create({
        boardId,
        title: title.trim(),
        status,
        priority,
        ...(ownerId !== '' ? { ownerId } : {}),
        ...(dueDate !== '' ? { dueDate: new Date(dueDate) } : {}),
        ...(assigneeIds.length > 0 ? { assigneeIds } : {}),
      }),
    onSuccess: async (item) => {
      // Booked against the task that was just made, so it lands on the agenda
      // and shows on the task's row straight away.
      if (withMeeting && meetingAt !== '' && workspaceId !== '') {
        const start = new Date(meetingAt);
        const attendeeIds = [...new Set([ownerId, ...assigneeIds].filter((id) => id !== ''))];

        try {
          await meetingsApi.schedule({
            workspaceId,
            title: `Review: ${title.trim()}`.slice(0, 200),
            startsAt: start,
            endsAt: new Date(start.getTime() + meetingMinutes * 60_000),
            attendeeIds: attendeeIds.length > 0 ? attendeeIds : [currentUserId],
            itemIds: [item.id],
          });
        } catch (error) {
          // The task exists and is the thing that was asked for; a failed
          // meeting must not throw that away without saying so.
          setMeetingError(error instanceof Error ? error.message : 'The meeting could not be booked');
          await queryClient.invalidateQueries({ queryKey: queryKeys.boardItems(boardId) });
          await queryClient.invalidateQueries({ queryKey: ['items'] });
          await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.boardItems(boardId) });
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (openAfter) navigate(`/boards/${boardId}?item=${item.id}`);
      onClose();
    },
  });

  const ready = boardId !== '' && title.trim() !== '';

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, background: 'rgba(13, 27, 62, 0.4)', zIndex: 80 }}
      />

      <div
        role="dialog"
        aria-label="Create a task"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(520px, calc(100vw - 32px))',
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
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 550 }}>Create a task</h2>
          <button className="btn btn--ghost btn--sm btn--icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {(workspaces.data?.length ?? 0) === 0 ? (
          <p className="meta" style={{ marginTop: 'var(--space-4)' }}>
            Create a workspace and a department first — a task has to live somewhere.
          </p>
        ) : (
          <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
            <div className="field">
              <label className="field__label" htmlFor="qt-title">Task</label>
              <input
                id="qt-title"
                className="field__input"
                autoFocus
                placeholder="What needs doing?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && ready && !create.isPending) create.mutate();
                }}
              />
            </div>

            <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
              {(workspaces.data?.length ?? 0) > 1 ? (
                <div className="field" style={{ flex: 1 }}>
                  <label className="field__label" htmlFor="qt-ws">Workspace</label>
                  <select
                    id="qt-ws"
                    className="field__input"
                    value={workspaceId}
                    onChange={(event) => setWorkspaceId(event.target.value)}
                  >
                    {workspaces.data?.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="field" style={{ flex: 1 }}>
                <label className="field__label" htmlFor="qt-board">Department</label>

                {addingDepartment ? (
                  <span className="row" style={{ gap: 'var(--space-2)' }}>
                    <input
                      className="field__input"
                      autoFocus
                      placeholder="New department name"
                      aria-label="New department name"
                      value={newDepartment}
                      onChange={(event) => setNewDepartment(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && newDepartment.trim() !== '') {
                          event.preventDefault();
                          createDepartment.mutate();
                        }
                        if (event.key === 'Escape') setAddingDepartment(false);
                      }}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={newDepartment.trim() === '' || createDepartment.isPending}
                      onClick={() => createDepartment.mutate()}
                    >
                      {createDepartment.isPending ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setAddingDepartment(false)}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <span className="row" style={{ gap: 'var(--space-2)' }}>
                    <select
                      id="qt-board"
                      className="field__input"
                      value={boardId}
                      onChange={(event) => setBoardId(event.target.value)}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      {(boards.data?.length ?? 0) === 0 ? (
                        <option value="">No department available</option>
                      ) : null}
                      {boards.data?.map((board) => (
                        <option key={board.id} value={board.id}>{board.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn--icon"
                      title="New department"
                      aria-label="New department"
                      onClick={() => setAddingDepartment(true)}
                    >
                      +
                    </button>
                  </span>
                )}

                {!boards.isPending && (boards.data?.length ?? 0) === 0 ? (
                  <p className="meta" style={{ marginTop: 6 }}>
                    No departments yet — make the first one with +.
                  </p>
                ) : null}

                {createDepartment.error ? <ErrorNotice error={createDepartment.error} /> : null}
              </div>
            </div>

            <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: 130 }}>
                <label className="field__label" htmlFor="qt-owner">Owner</label>
                <select
                  id="qt-owner"
                  className="field__input"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.data?.map((member) => (
                    <option key={member.userId} value={member.userId}>{member.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ width: 140 }}>
                <label className="field__label" htmlFor="qt-due">Due</label>
                <input
                  id="qt-due"
                  className="field__input"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
            </div>

            <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field__label" htmlFor="qt-status">Status</label>
                <select
                  id="qt-status"
                  className="field__input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ItemStatus)}
                >
                  {ITEM_STATUSES.filter((value) => value !== 'BLOCKED').map((value) => (
                    <option key={value} value={value}>{STATUS_TONE[value].label}</option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ flex: 1 }}>
                <label className="field__label" htmlFor="qt-priority">Priority</label>
                <select
                  id="qt-priority"
                  className="field__input"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>{PRIORITY_TONE[value].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <span className="field__label">Members</span>
              <AttendeePicker
                members={(members.data ?? []).filter((m) => m.userId !== ownerId)}
                selected={assigneeIds}
                onToggle={(userId) =>
                  setAssigneeIds((current) =>
                    current.includes(userId)
                      ? current.filter((id) => id !== userId)
                      : [...current, userId],
                  )
                }
              />
            </div>

            <div className="field">
              <label className="row" style={{ gap: 6, fontSize: 'var(--text-md)' }}>
                <input
                  type="checkbox"
                  checked={withMeeting}
                  onChange={(event) => {
                    setWithMeeting(event.target.checked);
                    if (event.target.checked && meetingAt === '') setMeetingAt(nextHour());
                  }}
                />
                Also schedule a meeting about this task
              </label>

              {withMeeting ? (
                <div
                  className="row"
                  style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}
                >
                  <input
                    className="field__input"
                    type="datetime-local"
                    aria-label="Meeting time"
                    value={meetingAt}
                    onChange={(event) => setMeetingAt(event.target.value)}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                  <input
                    className="field__input"
                    type="number"
                    min={5}
                    step={5}
                    aria-label="Meeting minutes"
                    value={meetingMinutes}
                    onChange={(event) => setMeetingMinutes(Number(event.target.value))}
                    style={{ width: 90 }}
                  />
                </div>
              ) : null}

              {meetingError ? (
                <p className="meta" style={{ color: 'var(--at-risk)', marginTop: 6 }}>
                  The task was created. {meetingError}
                </p>
              ) : null}
            </div>

            <label className="row" style={{ gap: 6, fontSize: 'var(--text-base)' }}>
              <input
                type="checkbox"
                checked={openAfter}
                onChange={(event) => setOpenAfter(event.target.checked)}
              />
              Open the task after creating it
            </label>

            {create.error ? <ErrorNotice error={create.error} /> : null}

            <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button
                className="btn btn--primary"
                disabled={!ready || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'Creating…' : 'Create task'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
