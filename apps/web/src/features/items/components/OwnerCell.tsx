import type { MemberDto } from '@ewp/contracts';

import { Avatar } from '@/shared/components/Avatar';

import { AssigneePicker } from './AssigneePicker';

/**
 * The people column: one accountable owner, then anyone else on the task.
 * The owner is a plain select because there can only ever be one; the rest
 * are a checklist, because there is no natural limit.
 */
export function OwnerCell({
  owner,
  assignees,
  members,
  onChange,
  onAssigneesChange,
  disabled,
}: {
  owner: { id: string; fullName: string } | null;
  assignees: Array<{ id: string; fullName: string }>;
  members: MemberDto[];
  onChange: (ownerId: string | null) => void;
  onAssigneesChange: (userIds: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Avatar id={owner?.id ?? null} fullName={owner?.fullName ?? null} size={24} />

      <select
        aria-label="Owner"
        value={owner?.id ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        style={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          font: 'inherit',
          fontSize: 'var(--text-base)',
          color: owner ? 'var(--ink)' : 'var(--ink-muted)',
          minWidth: 0,
          flex: 1,
          cursor: disabled ? 'default' : 'pointer',
          textOverflow: 'ellipsis',
        }}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.fullName}
          </option>
        ))}
      </select>

      <AssigneePicker
        assignees={assignees}
        members={members}
        ownerId={owner?.id ?? null}
        disabled={disabled}
        onChange={onAssigneesChange}
      />
    </div>
  );
}
