import { ROLES, type Role } from '@ewp/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/api/query-keys';

import { membersApi } from '../api/members.api';

/** Ownership is transferred, never invited - the invite schema rejects it. */
type AssignableRole = Exclude<Role, 'OWNER'>;

const ASSIGNABLE_ROLES = ROLES.filter((role): role is AssignableRole => role !== 'OWNER');

export function InviteMemberForm() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('MEMBER');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => membersApi.invite({ email, role, workspaceIds: [] }),
    onSuccess: () => {
      setEmail('');
      setFieldErrors({});
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
    },
    onError: (error) => {
      setFieldErrors(error instanceof ApiError ? error.fieldErrors : {});
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}
      noValidate
    >
      <div className="field" style={{ flex: '1 1 240px' }}>
        <label className="field__label" htmlFor="invite-email">Work email</label>
        <input
          id="invite-email"
          className="field__input"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          required
        />
        {fieldErrors.email ? <span className="field__error">{fieldErrors.email}</span> : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="invite-role">Role</label>
        <select
          id="invite-role"
          className="field__input"
          value={role}
          onChange={(event) => setRole(event.target.value as AssignableRole)}
        >
          {ASSIGNABLE_ROLES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <button className="btn btn--primary" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Sending…' : 'Send invitation'}
      </button>

      {mutation.error && !Object.keys(fieldErrors).length ? (
        <p className="field__error" role="alert" style={{ flexBasis: '100%' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'That did not send'}
        </p>
      ) : null}
    </form>
  );
}
