import { ROLES, ROLE_RANK, type MemberDto, type Role } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuth } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { Avatar } from '@/shared/components/Avatar';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { formatDate } from '@/shared/lib/format';

import { membersApi } from '../api/members.api';
import { InviteMemberForm } from '../components/InviteMemberForm';

/** Ownership is transferred, not assigned, so it is never offered here. */
const ASSIGNABLE = ROLES.filter((role): role is Exclude<Role, 'OWNER'> => role !== 'OWNER');

export function MembersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [confirming, setConfirming] = useState<string | null>(null);

  const rank = user ? ROLE_RANK[user.role] : 0;
  const canManageRoles = rank >= ROLE_RANK.ADMIN;
  const canRemove = rank >= ROLE_RANK.ADMIN;
  const canRevokeInvites = rank >= ROLE_RANK.MANAGER;

  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const invitations = useQuery({
    queryKey: queryKeys.invitations,
    queryFn: membersApi.listInvitations,
  });

  const refreshMembers = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.members }).then(() => undefined);

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      membersApi.changeRole(userId, { role }),
    onSuccess: refreshMembers,
  });

  const setJobTitle = useMutation({
    mutationFn: ({ userId, jobTitle }: { userId: string; jobTitle: string | null }) =>
      membersApi.setJobTitle(userId, jobTitle),
    onSuccess: refreshMembers,
  });

  const remove = useMutation({
    mutationFn: (userId: string) => membersApi.remove(userId),
    onSuccess: async () => {
      setConfirming(null);
      await refreshMembers();
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => membersApi.revokeInvitation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations }).then(() => undefined),
  });

  /** The two people nobody may remove: yourself, and an owner. */
  const removable = (member: MemberDto): boolean =>
    member.userId !== user?.id && member.role !== 'OWNER';

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader title="People" subtitle="Invite colleagues and set what each of them can do" />

      {changeRole.error ? <ErrorNotice error={changeRole.error} /> : null}
      {remove.error ? <ErrorNotice error={remove.error} /> : null}
      {revoke.error ? <ErrorNotice error={revoke.error} /> : null}

      <section className="card">
        <h2 className="card__title">Add someone</h2>
        <InviteMemberForm />
      </section>

      <section className="card card--flush">
        <h2 className="card__title" style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
          Members
        </h2>

        {members.isPending ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <SkeletonRows rows={4} height={44} />
          </div>
        ) : members.error ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <ErrorNotice error={members.error} />
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-3)' }}>
            {members.data?.map((member) => {
              const isSelf = member.userId === user?.id;
              const busy = remove.isPending || changeRole.isPending;

              return (
                <div
                  key={member.userId}
                  className="row"
                  style={{
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-5)',
                    borderTop: '1px solid var(--line)',
                    flexWrap: 'wrap',
                  }}
                >
                  <Avatar id={member.userId} fullName={member.fullName} size={30} />

                  <span style={{ flex: 1, minWidth: 150 }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-md)', fontWeight: 500 }}>
                      {member.fullName}
                      {isSelf ? <span className="meta"> · you</span> : null}
                    </span>
                    <span className="meta">{member.email}</span>
                  </span>

                  {/* Collected at sign-up and never shown until now. Editable
                      here because a title typed once was otherwise permanent. */}
                  {canManageRoles ? (
                    <input
                      className="field__input"
                      aria-label={`Job title for ${member.fullName}`}
                      placeholder="Job title"
                      defaultValue={member.jobTitle ?? ''}
                      disabled={busy}
                      style={{ height: 30, fontSize: 'var(--text-base)', width: 170 }}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next === (member.jobTitle ?? '')) return;
                        setJobTitle.mutate({
                          userId: member.userId,
                          jobTitle: next === '' ? null : next,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                      }}
                    />
                  ) : (
                    <span
                      className="meta"
                      style={{ width: 170, fontSize: 'var(--text-base)' }}
                      title={member.jobTitle ?? undefined}
                    >
                      {member.jobTitle ?? '—'}
                    </span>
                  )}

                  <span className="meta" style={{ whiteSpace: 'nowrap' }}>
                    joined {formatDate(member.joinedAt)}
                  </span>

                  {/* An owner's role is fixed until ownership is transferred. */}
                  {canManageRoles && member.role !== 'OWNER' ? (
                    <select
                      className="field__input"
                      aria-label={`Role for ${member.fullName}`}
                      value={member.role}
                      disabled={busy}
                      style={{ height: 30, fontSize: 'var(--text-base)', width: 130 }}
                      onChange={(event) =>
                        changeRole.mutate({
                          userId: member.userId,
                          role: event.target.value as Role,
                        })
                      }
                    >
                      {ASSIGNABLE.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="badge"
                      style={{ background: 'var(--accent-wash)', color: 'var(--accent)' }}
                    >
                      {member.role.toLowerCase()}
                    </span>
                  )}

                  {canRemove && removable(member) ? (
                    confirming === member.userId ? (
                      <>
                        <span style={{ fontSize: 'var(--text-base)' }}>Remove?</span>
                        <button
                          className="btn btn--sm"
                          disabled={busy}
                          style={{ borderColor: 'var(--blocked)', color: 'var(--blocked)' }}
                          onClick={() => remove.mutate(member.userId)}
                        >
                          {remove.isPending ? 'Removing…' : 'Yes, remove'}
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn--ghost btn--sm"
                        disabled={busy}
                        onClick={() => setConfirming(member.userId)}
                      >
                        Remove
                      </button>
                    )
                  ) : (
                    <span
                      className="meta"
                      style={{ fontSize: 'var(--text-xs)', width: 74, textAlign: 'right' }}
                      title={
                        isSelf
                          ? 'You cannot remove yourself'
                          : member.role === 'OWNER'
                            ? 'Transfer ownership first'
                            : undefined
                      }
                    >
                      {canRemove ? (isSelf ? 'you' : 'owner') : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Pending invitations</h2>

        {(invitations.data?.length ?? 0) === 0 ? (
          <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-md)' }}>
            Nobody is waiting to join.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {invitations.data?.map((invitation) => (
              <li
                key={invitation.id}
                className="row"
                style={{ gap: 'var(--space-3)', padding: '8px 0', flexWrap: 'wrap' }}
              >
                <span style={{ flex: 1, minWidth: 160, fontSize: 'var(--text-md)' }}>
                  {invitation.email}
                </span>
                <span className="meta">
                  {invitation.status.toLowerCase()} ·{' '}
                  {invitation.emailDeliveredAt ? 'email sent' : 'email queued'} · expires{' '}
                  {formatDate(invitation.expiresAt)}
                </span>
                {canRevokeInvites && invitation.status === 'PENDING' ? (
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(invitation.id)}
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
