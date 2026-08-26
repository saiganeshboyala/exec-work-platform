import { ROLES, type Role } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { Avatar } from '@/shared/components/Avatar';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/lib/format';

/** Ownership is transferred, never granted at approval time. */
const ASSIGNABLE = ROLES.filter((role): role is Exclude<Role, 'OWNER'> => role !== 'OWNER');

/**
 * People who signed up themselves and cannot do anything until somebody here
 * says yes. Approving is also where their role is chosen, because "let them in"
 * and "at what level" are one decision.
 */
export function ApprovalsPanel() {
  const queryClient = useQueryClient();
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

  const pending = useQuery({ queryKey: ['pending-members'], queryFn: membersApi.listPending });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['pending-members'] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.members });
  };

  const approve = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      membersApi.approve(userId, { role: role as Exclude<Role, 'OWNER'> }),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (userId: string) => membersApi.reject(userId),
    onSuccess: async () => {
      setConfirming(null);
      await invalidate();
    },
  });

  if (pending.isPending) return <SkeletonRows rows={3} height={56} />;
  if (pending.error) return <ErrorNotice error={pending.error} />;

  const rows = pending.data ?? [];

  return (
    <div className="stack" style={{ gap: 'var(--space-3)' }}>
      {approve.error ? <ErrorNotice error={approve.error} /> : null}
      {reject.error ? <ErrorNotice error={reject.error} /> : null}

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-7)' }}>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 500 }}>Nobody is waiting</p>
          <p className="meta" style={{ marginTop: 6 }}>
            People who request access from the sign-in page will appear here for approval.
          </p>
        </div>
      ) : (
        <div className="card card--flush">
          {rows.map((person) => {
            const role = roles[person.userId] ?? 'MEMBER';
            const busy = approve.isPending || reject.isPending;

            return (
              <div
                key={person.userId}
                className="row"
                style={{
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--line)',
                  flexWrap: 'wrap',
                }}
              >
                <Avatar id={person.userId} fullName={person.fullName} size={30} />

                <span style={{ flex: 1, minWidth: 160 }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-md)', fontWeight: 500 }}>
                    {person.fullName}
                  </span>
                  <span className="meta">
                    {person.email}
                    {person.jobTitle ? ` · ${person.jobTitle}` : ''}
                  </span>
                </span>

                <span className="meta" style={{ whiteSpace: 'nowrap' }}>
                  asked {formatDateTime(person.requestedAt)}
                </span>

                {confirming === person.userId ? (
                  <>
                    <span style={{ fontSize: 'var(--text-base)' }}>Decline this request?</span>
                    <button
                      className="btn btn--sm"
                      disabled={busy}
                      style={{ borderColor: 'var(--blocked)', color: 'var(--blocked)' }}
                      onClick={() => reject.mutate(person.userId)}
                    >
                      Yes, decline
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirming(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <label className="row" style={{ gap: 6 }}>
                      <span className="meta">as</span>
                      <select
                        className="field__input"
                        aria-label={`Role for ${person.fullName}`}
                        value={role}
                        style={{ height: 30, fontSize: 'var(--text-base)' }}
                        onChange={(event) =>
                          setRoles((current) => ({
                            ...current,
                            [person.userId]: event.target.value as Role,
                          }))
                        }
                      >
                        {ASSIGNABLE.map((value) => (
                          <option key={value} value={value}>
                            {value.charAt(0) + value.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      className="btn btn--primary btn--sm"
                      disabled={busy}
                      onClick={() => approve.mutate({ userId: person.userId, role })}
                    >
                      {approve.isPending ? 'Approving…' : 'Approve'}
                    </button>

                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={busy}
                      onClick={() => setConfirming(person.userId)}
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
