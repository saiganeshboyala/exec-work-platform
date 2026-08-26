import type { BoardFilters, SavedViewDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { viewsApi } from '../api/views.api';

/**
 * Saved views turn a set of filters into something a team can share and return
 * to. The default view is what the board opens with, which is the whole reason
 * this exists rather than people re-picking filters every morning.
 */
export function SavedViewPicker({
  boardId,
  filters,
  activeViewId,
  onApply,
}: {
  boardId: string;
  filters: BoardFilters;
  activeViewId: string | null;
  onApply: (view: SavedViewDto | null) => void;
}) {
  const queryClient = useQueryClient();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);

  const views = useQuery({
    queryKey: ['views', boardId],
    queryFn: () => viewsApi.list(boardId),
  });

  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['views', boardId] }).then(() => undefined);

  const create = useMutation({
    mutationFn: () =>
      viewsApi.create({ name: name.trim(), boardId, filters, shared, isDefault: false }),
    onSuccess: async (view) => {
      setNaming(false);
      setName('');
      setShared(false);
      await invalidate();
      onApply(view);
    },
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => viewsApi.update(id, { isDefault: true }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => viewsApi.remove(id),
    onSuccess: async () => {
      onApply(null);
      await invalidate();
    },
  });

  const active = views.data?.find((view) => view.id === activeViewId) ?? null;

  return (
    <div className="row" style={{ gap: 'var(--space-2)' }}>
      <select
        aria-label="Saved view"
        className="field__input"
        style={{ height: 30, fontSize: 'var(--text-base)', minWidth: 170 }}
        value={activeViewId ?? ''}
        onChange={(event) => {
          const view = views.data?.find((candidate) => candidate.id === event.target.value);
          onApply(view ?? null);
        }}
      >
        <option value="">All tasks</option>
        {views.data?.map((view) => (
          <option key={view.id} value={view.id}>
            {view.name}
            {view.isDefault ? ' ★' : ''}
            {view.shared ? ' (shared)' : ''}
          </option>
        ))}
      </select>

      {naming ? (
        <>
          <input
            className="field__input"
            style={{ height: 30, width: 170, fontSize: 'var(--text-base)' }}
            placeholder="View name"
            aria-label="View name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() !== '') create.mutate();
              if (event.key === 'Escape') setNaming(false);
            }}
          />
          <label className="row" style={{ gap: 4, fontSize: 'var(--text-base)' }}>
            <input
              type="checkbox"
              checked={shared}
              onChange={(event) => setShared(event.target.checked)}
            />
            Share
          </label>
          <button
            className="btn btn--primary btn--sm"
            disabled={name.trim() === '' || create.isPending}
            onClick={() => create.mutate()}
          >
            Save
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setNaming(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button className="btn btn--sm" onClick={() => setNaming(true)}>
            Save view
          </button>

          {active ? (
            <>
              {!active.isDefault ? (
                <button
                  className="btn btn--ghost btn--sm"
                  title="Open this view by default"
                  onClick={() => setDefault.mutate(active.id)}
                >
                  Make default
                </button>
              ) : null}
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => remove.mutate(active.id)}
                title="Delete this view"
              >
                Delete view
              </button>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
