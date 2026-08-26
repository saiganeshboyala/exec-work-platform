import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { Spinner } from '@/shared/components/Spinner';
import { formatDate } from '@/shared/lib/format';

import { membersApi } from '../api/members.api';
import { InviteMemberForm } from '../components/InviteMemberForm';

export function MembersPage() {
  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const invitations = useQuery({
    queryKey: queryKeys.invitations,
    queryFn: membersApi.listInvitations,
  });

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400 }}>People</h1>
        <p className="meta">Invite colleagues and set what each of them can do</p>
      </header>

      <section className="card">
        <h2 className="card__title">Add someone</h2>
        <InviteMemberForm />
      </section>

      <section className="card">
        <h2 className="card__title">Members</h2>
        {members.isPending ? <Spinner /> : null}
        {members.error ? <ErrorNotice error={members.error} /> : null}
        {members.data ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-muted)', fontSize: 12 }}>
                <th style={{ padding: '6px 0' }}>Name</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.data.map((member) => (
                <tr key={member.userId} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ fontWeight: 500 }}>{member.fullName}</div>
                    <div className="meta">{member.email}</div>
                  </td>
                  <td>{member.role.charAt(0) + member.role.slice(1).toLowerCase()}</td>
                  <td className="meta">{formatDate(member.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="card">
        <h2 className="card__title">Pending invitations</h2>
        {invitations.data?.length === 0 ? (
          <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>Nobody is waiting to join.</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--space-2)' }}>
            {invitations.data?.map((invitation) => (
              <li key={invitation.id} style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{invitation.email}</span>
                <span className="meta" style={{ marginLeft: 8 }}>
                  {invitation.status.toLowerCase()} ·{' '}
                  {invitation.emailDeliveredAt ? 'email sent' : 'email queued'} · expires{' '}
                  {formatDate(invitation.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
