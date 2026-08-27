import { ROLE_RANK } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { InlineCreate } from '@/shared/components/InlineCreate';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonCards, SkeletonRows } from '@/shared/components/Skeleton';
import { pluralize } from '@/shared/lib/format';

import { boardsApi } from '../api/boards.api';
import { DepartmentPeek } from '../components/DepartmentPeek';

export function BoardsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user ? ROLE_RANK[user.role] >= ROLE_RANK.MEMBER : false;

  const [workspaceId, setWorkspaceId] = useState('');
  // Which department is open below the cards. One at a time: two expanded
  // panels push the second so far down it is off screen anyway.
  const [peekId, setPeekId] = useState<string | null>(null);

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
  // Switching workspace can leave the open department behind; resolving it from
  // the current list rather than trusting the id keeps the panel honest.
  const peek = boards.data?.find((board) => board.id === peekId) ?? null;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Departments"
        subtitle="Work lives in departments. Each department belongs to one workspace."
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
            body="A workspace groups the departments one part of the business owns."
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
              <button
                key={board.id}
                type="button"
                aria-expanded={peekId === board.id}
                onClick={() => setPeekId((current) => (current === board.id ? null : board.id))}
                className="card"
                style={{
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 'var(--space-4)',
                  borderColor: peekId === board.id ? 'var(--accent)' : undefined,
                  transition: 'box-shadow var(--transition), border-color var(--transition)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  event.currentTarget.style.borderColor = 'var(--accent-line)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  event.currentTarget.style.borderColor =
                    peekId === board.id ? 'var(--accent)' : 'var(--line)';
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

                <span className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="meta">{pluralize(board.itemCount, 'task')}</span>
                  <span aria-hidden="true" className="meta" style={{ fontSize: 10 }}>
                    {peekId === board.id ? '▴' : '▾'}
                  </span>
                </span>
              </button>
            ))}

            {canEdit ? (
              <InlineCreate
                label="New department"
                placeholder="Department name"
                variant="card"
                pending={createBoard.isPending}
                onSubmit={(name) => createBoard.mutate(name)}
              />
            ) : null}
          </div>

          {peek ? <DepartmentPeek boardId={peek.id} boardName={peek.name} /> : null}

          {createBoard.error ? <ErrorNotice error={createBoard.error} /> : null}
        </>
      )}
    </div>
  );
}
