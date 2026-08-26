import { ITEM_STATUSES, PRIORITIES, type ItemStatus, type Priority } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { boardsApi } from '@/features/boards';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PRIORITY_TONE, STATUS_TONE } from '@/shared/lib/item-meta';

import { itemsApi } from '../api/items.api';

/**
 * Creates a task from anywhere, without first navigating to the right board.
 * The board picker is the only field that has no sensible default, so it is
 * the one thing asked for beyond a title.
 */
export function QuickCreateTask({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [workspaceId, setWorkspaceId] = useState('');
  const [boardId, setBoardId] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ItemStatus>('NOT_STARTED');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openAfter, setOpenAfter] = useState(false);

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

  const create = useMutation({
    mutationFn: () =>
      itemsApi.create({
        boardId,
        title: title.trim(),
        status,
        priority,
        ...(ownerId !== '' ? { ownerId } : {}),
        ...(dueDate !== '' ? { dueDate: new Date(dueDate) } : {}),
      }),
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.boardItems(boardId) });
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
            Create a workspace and a board first — a task has to live somewhere.
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
                <label className="field__label" htmlFor="qt-board">Board</label>
                <select
                  id="qt-board"
                  className="field__input"
                  value={boardId}
                  onChange={(event) => setBoardId(event.target.value)}
                >
                  {(boards.data?.length ?? 0) === 0 ? (
                    <option value="">No boards in this workspace</option>
                  ) : null}
                  {boards.data?.map((board) => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
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
