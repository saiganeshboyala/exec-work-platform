import type { ItemDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { boardsApi } from '@/features/boards';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';

/**
 * Which department a task belongs to, and a way to move it. Creating one from
 * here saves leaving a half-edited task to go and make the department first.
 */
export function DepartmentRow({
  item,
  canEdit,
  onMove,
}: {
  item: ItemDto;
  canEdit: boolean;
  onMove: (boardId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const boards = useQuery({ queryKey: ['boards', 'all'], queryFn: boardsApi.listAll });
  const workspaces = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: boardsApi.listWorkspaces,
    enabled: creating,
  });

  // A new department lands beside the one the task is in now, which is the only
  // workspace we can infer without asking.
  const currentWorkspaceId =
    boards.data?.find((board) => board.id === item.boardId)?.workspaceId ??
    workspaces.data?.[0]?.id ??
    '';

  const create = useMutation({
    mutationFn: () =>
      boardsApi.create({ workspaceId: currentWorkspaceId, name: name.trim(), isPortfolio: false }),
    onSuccess: async (board) => {
      setName('');
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ['boards'] });
      // Made from inside a task: the point was to put this task in it.
      onMove(board.id);
    },
  });

  if (creating) {
    return (
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <input
            className="field__input"
            autoFocus
            placeholder="New department name"
            aria-label="New department name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() !== '') create.mutate();
              if (event.key === 'Escape') setCreating(false);
            }}
          />
          <button
            className="btn btn--primary btn--sm"
            disabled={name.trim() === '' || currentWorkspaceId === '' || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </div>
        {create.error ? <ErrorNotice error={create.error} /> : null}
      </div>
    );
  }

  return (
    <div className="row" style={{ gap: 'var(--space-2)' }}>
      <select
        className="field__input"
        aria-label="Department"
        value={item.boardId}
        disabled={!canEdit || boards.isPending}
        onChange={(event) => onMove(event.target.value)}
        style={{ flex: 1 }}
      >
        {/* The task's own department, in case the list has not arrived yet. */}
        {boards.data === undefined ? (
          <option value={item.boardId}>{item.boardName}</option>
        ) : (
          boards.data.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))
        )}
      </select>

      {canEdit ? (
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setCreating(true)}
          title="Create a department and move this task into it"
        >
          + New
        </button>
      ) : null}
    </div>
  );
}
