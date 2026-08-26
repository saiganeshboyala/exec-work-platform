import { ROLE_RANK } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { InlineCreate } from '@/shared/components/InlineCreate';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonCards, SkeletonRows } from '@/shared/components/Skeleton';
import { pluralize } from '@/shared/lib/format';

import { boardsApi } from '../api/boards.api';

export function BoardsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user ? ROLE_RANK[user.role] >= ROLE_RANK.MEMBER : false;

  const [workspaceId, setWorkspaceId] = useState('');

  const workspaces = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: boardsApi.listWorkspaces,
  });

  // Select the first workspace once, without fighting a later manual choice.
  useEffect(() => {
    if (workspaceId === '' && workspaces.data?.[0]) setWorkspaceId(workspaces.data[0].id);
  }, [workspaces.data, workspaceId]);

  const boards = useQuery({
    queryKey: queryKeys.boards(workspaceId),
    queryFn: () => boardsApi.list(workspaceId),
    enabled: workspaceId !== '',
  });

  const createWorkspace = useMutation({
    mutationFn: (name: string) => boardsApi.createWorkspace({ name }),
    onSuccess: async (created) => {
      // Jump straight into whatever was just created.
      setWorkspaceId(created.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });

  const createBoard = useMutation({
    mutationFn: (name: string) => boardsApi.create({ workspaceId, name, isPortfolio: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.boards(workspaceId) }),
  });

  if (workspaces.isPending) {
    return (
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <SkeletonRows rows={1} height={44} />
        <SkeletonCards cards={6} />
      </div>
    );
  }
  if (workspaces.error) return <ErrorNotice error={workspaces.error} />;

  const hasWorkspace = (workspaces.data?.length ?? 0) > 0;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Boards"
        subtitle="Work lives on boards. Each board belongs to one workspace."
        actions={
          hasWorkspace ? (
            <span className="row" style={{ gap: 'var(--space-2)' }}>
              <span className="meta">Workspace</span>
              <select
                className="field__input"
                aria-label="Workspace"
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                style={{ minWidth: 190 }}
              >
                {workspaces.data?.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>

              {canEdit ? (
                <InlineCreate
                  label="New workspace"
                  placeholder="Workspace name"
                  pending={createWorkspace.isPending}
                  onSubmit={(name) => createWorkspace.mutate(name)}
                />
              ) : null}
            </span>
          ) : null
        }
      />

      {createWorkspace.error ? <ErrorNotice error={createWorkspace.error} /> : null}

      {!hasWorkspace ? (
        <div className="card">
          <EmptyState
            title="Create your first workspace"
            body="A workspace groups the boards one part of the business owns."
          />
          {canEdit ? (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <InlineCreate
                label="New workspace"
                placeholder="e.g. Operations"
                variant="card"
                pending={createWorkspace.isPending}
                onSubmit={(name) => createWorkspace.mutate(name)}
              />
            </div>
          ) : null}
        </div>
      ) : boards.isPending ? (
        <SkeletonCards cards={6} />
      ) : boards.error ? (
        <ErrorNotice error={boards.error} />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {boards.data?.map((board) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 'var(--space-4)',
                  transition: 'box-shadow var(--transition), border-color var(--transition)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  event.currentTarget.style.borderColor = 'var(--accent-line)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  event.currentTarget.style.borderColor = 'var(--line)';
                }}
              >
                <span className="row" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 550 }}>{board.name}</h2>
                  {board.isPortfolio ? (
                    <span
                      className="badge"
                      style={{ background: 'var(--accent-wash)', color: 'var(--accent)' }}
                      title="Rolls up to Todo"
                    >
                      Portfolio
                    </span>
                  ) : null}
                </span>

                <span className="meta">{pluralize(board.itemCount, 'task')}</span>
              </Link>
            ))}

            {canEdit ? (
              <InlineCreate
                label="New board"
                placeholder="Board name"
                variant="card"
                pending={createBoard.isPending}
                onSubmit={(name) => createBoard.mutate(name)}
              />
            ) : null}
          </div>

          {createBoard.error ? <ErrorNotice error={createBoard.error} /> : null}
        </>
      )}
    </div>
  );
}
