import { ITEM_STATUSES, PRIORITIES, type MemberDto } from '@ewp/contracts';
import { useState } from 'react';

import { PRIORITY_TONE, STATUS_TONE } from '@/shared/lib/item-meta';

import type { BulkPatch } from '../hooks/useBulkActions';

/**
 * Floats over the board while rows are selected. Deliberately modal-free: the
 * whole point of bulk editing is not stopping to confirm each change.
 */
export function BulkActionBar({
  count,
  members,
  pending,
  onApply,
  onDelete,
  onClear,
}: {
  count: number;
  members: MemberDto[];
  pending: boolean;
  onApply: (patch: BulkPatch) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div
      role="region"
      aria-label={`${count} tasks selected`}
      style={{
        position: 'sticky',
        bottom: 'var(--space-4)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--ink)',
        color: 'var(--paper)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <strong style={{ fontSize: 'var(--text-md)' }}>{count} selected</strong>

      <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.25)' }} />

      <select
        aria-label="Set status for selected"
        defaultValue=""
        disabled={pending}
        onChange={(event) => {
          const status = event.target.value;
          event.currentTarget.value = '';
          if (status === '') return;
          // Blocked needs a reason, which a bulk bar has nowhere to ask for.
          if (status === 'BLOCKED') {
            onApply({ status: 'BLOCKED', blockedReason: 'Bulk update — reason to be added' });
            return;
          }
          onApply({ status: status as BulkPatch['status'] });
        }}
        style={selectStyle}
      >
        <option value="">Set status…</option>
        {ITEM_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_TONE[status].label}
          </option>
        ))}
      </select>

      <select
        aria-label="Set priority for selected"
        defaultValue=""
        disabled={pending}
        onChange={(event) => {
          const priority = event.target.value;
          event.currentTarget.value = '';
          if (priority !== '') onApply({ priority: priority as BulkPatch['priority'] });
        }}
        style={selectStyle}
      >
        <option value="">Set priority…</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_TONE[priority].label}
          </option>
        ))}
      </select>

      <select
        aria-label="Assign selected to"
        defaultValue=""
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value;
          event.currentTarget.value = '';
          if (value === '') return;
          onApply({ ownerId: value === 'none' ? null : value });
        }}
        style={selectStyle}
      >
        <option value="">Assign to…</option>
        <option value="none">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.fullName}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="Set due date for selected"
        disabled={pending}
        onChange={(event) => {
          if (event.target.value !== '') onApply({ dueDate: new Date(event.target.value) });
        }}
        style={selectStyle}
      />

      <span style={{ marginLeft: 'auto' }} />

      {confirmingDelete ? (
        <>
          <span style={{ fontSize: 'var(--text-base)' }}>Delete {count}?</span>
          <button
            className="btn btn--sm"
            style={{ background: 'var(--blocked)', borderColor: 'var(--blocked)', color: '#fff' }}
            disabled={pending}
            onClick={() => {
              onDelete();
              setConfirmingDelete(false);
            }}
          >
            Yes, delete
          </button>
          <button className="btn btn--sm" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
        </>
      ) : (
        <button className="btn btn--sm" disabled={pending} onClick={() => setConfirmingDelete(true)}>
          Delete
        </button>
      )}

      <button className="btn btn--sm" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

const selectStyle = {
  height: 30,
  padding: '0 var(--space-2)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 'var(--radius)',
  background: 'rgba(255,255,255,0.1)',
  color: 'var(--paper)',
  font: 'inherit',
  fontSize: 'var(--text-base)',
  colorScheme: 'dark',
} as const;
