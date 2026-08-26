import { ROLES, type Role } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { boardsApi } from '@/features/boards';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { Avatar } from '@/shared/components/Avatar';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';

import { adminApi } from '../api/admin.api';

/**
 * Grants that override the organisation-wide role for one workspace or board.
 * This is what lets a GUEST edit a single board and see nothing else.
 */
export function AccessPanel() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [scope, setScope] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');

  const access = useQuery({ queryKey: ['access'], queryFn: adminApi.listAccess });
  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const workspaces = useQuery({ queryKey: queryKeys.workspaces, queryFn: boardsApi.listWorkspaces });

  const firstWorkspace = workspaces.data?.[0]?.id ?? '';
  const boards = useQuery({
    queryKey: queryKeys.boards(firstWorkspace),
    queryFn: () => boardsApi.list(firstWorkspace),
    enabled: firstWorkspace !== '',
  });

  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['access'] }).then(() => undefined);

  const grant = useMutation({
    mutationFn: () => {
      const [kind, id] = scope.split(':');
      return adminApi.grantAccess({
        userId,
        role,
        ...(kind === 'workspace' ? { workspaceId: id } : { boardId: id }),
      });
    },
    onSuccess: async () => {
      setUserId('');
      setScope('');
      await invalidate();
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => adminApi.revokeAccess(id),
    onSuccess: invalidate,
  });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className="card stack">
        <p className="card__title" style={{ marginBottom: 0 }}>Grant access</p>

        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <select
            className="field__input"
            aria-label="Person"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Choose a person…</option>
            {members.data?.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName} ({member.role.toLowerCase()})
              </option>
            ))}
          </select>

          <select
            className="field__input"
            aria-label="Scope"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="">Choose a workspace or board…</option>
            {workspaces.data?.map((workspace) => (
              <option key={workspace.id} value={`workspace:${workspace.id}`}>
                Workspace · {workspace.name}
              </option>
            ))}
            {boards.data?.map((board) => (
              <option key={board.id} value={`board:${board.id}`}>
                Board · {board.name}
              </option>
            ))}
          </select>

          <select
            className="field__input"
            aria-label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <button
            className="btn btn--primary"
            disabled={userId === '' || scope === '' || grant.isPending}
            onClick={() => grant.mutate()}
          >
            {grant.isPending ? 'Granting…' : 'Grant'}
          </button>
        </div>

        {grant.error ? <ErrorNotice error={grant.error} /> : null}

        <p className="meta">
          A grant only ever raises what someone can do in that one place. The organisation role
          still applies everywhere else.
        </p>
      </div>

      {access.isPending ? (
        <SkeletonRows rows={3} height={48} />
      ) : access.error ? (
        <ErrorNotice error={access.error} />
      ) : (
        <div className="card card--flush">
          {(access.data ?? []).map((row) => (
            <div
              key={row.id}
              className="row"
              style={{ padding: '11px var(--space-4)', borderBottom: '1px solid var(--line)', gap: 'var(--space-3)' }}
            >
              <Avatar id={row.user.id} fullName={row.user.fullName} size={26} />
              <span style={{ flex: 1, fontSize: 'var(--text-md)' }}>{row.user.fullName}</span>
              <span className="meta">{row.workspaceId ? 'workspace' : 'board'}</span>
              <span style={{ fontSize: 'var(--text-base)' }}>{row.scopeName}</span>
              <span className="badge" style={{ background: 'var(--accent-wash)', color: 'var(--accent)' }}>
                {row.role.toLowerCase()}
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => revoke.mutate(row.id)}>
                Revoke
              </button>
            </div>
          ))}

          {access.data?.length === 0 ? (
            <p className="meta" style={{ padding: 'var(--space-4)' }}>
              No scoped grants. Everyone is on their organisation role.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
