import {
  ITEM_STATUSES,
  PRIORITIES,
  type ItemDto,
  type ItemStatus,
  type MemberDto,
  type Priority,
  type UpdateItemInput,
} from '@ewp/contracts';
import { useState } from 'react';

import { CalendarIcon } from '@/shared/components/icons';
import { MeetingCell } from '@/shared/components/MeetingCell';
import { PRIORITY_TONE, STATUS_TONE, toDateInputValue } from '@/shared/lib/item-meta';

import { OwnerCell } from './OwnerCell';
import { SelectCell } from './SelectCell';
import { TitleCell } from './TitleCell';

export const BOARD_GRID = '28px 1fr 232px 148px 126px 140px 138px 104px';

export function ItemRow({
  item,
  members,
  canEdit,
  selected,
  onSelect,
  onOpen,
  onSchedule,
  onPatch,
  onDelete,
}: {
  item: ItemDto;
  members: MemberDto[];
  canEdit: boolean;
  selected: boolean;
  onSelect: (next: boolean) => void;
  onOpen: () => void;
  onSchedule: () => void;
  onPatch: (patch: UpdateItemInput) => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const overdue =
    item.dueDate !== null && item.status !== 'DONE' && new Date(item.dueDate) < new Date();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: BOARD_GRID,
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '3px var(--space-3)',
        borderBottom: '1px solid var(--line)',
        background: selected
          ? 'var(--accent-wash)'
          : hovered
            ? 'var(--surface-sunk)'
            : 'var(--surface)',
        transition: 'background var(--transition)',
      }}
    >
      <input
        type="checkbox"
        aria-label={`Select ${item.title}`}
        checked={selected}
        onChange={(event) => onSelect(event.target.checked)}
        style={{ justifySelf: 'center' }}
      />

      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {item.status === 'BLOCKED' && item.blockedReason ? (
          <span
            title={item.blockedReason}
            aria-label={`Blocked: ${item.blockedReason}`}
            style={{ color: 'var(--blocked)', fontSize: 12, flexShrink: 0 }}
          >
            ●
          </span>
        ) : null}
        <TitleCell value={item.title} disabled={!canEdit} onCommit={(title) => onPatch({ title })} />
      </span>

      <OwnerCell
        owner={item.owner}
        assignees={item.assignees}
        members={members}
        disabled={!canEdit}
        onChange={(ownerId) => onPatch({ ownerId })}
        onAssigneesChange={(assigneeIds) => onPatch({ assigneeIds })}
      />

      <SelectCell<ItemStatus>
        ariaLabel="Status"
        value={item.status}
        options={ITEM_STATUSES}
        tone={STATUS_TONE}
        disabled={!canEdit}
        onChange={(status) => onPatch({ status })}
      />

      <SelectCell<Priority>
        ariaLabel="Priority"
        value={item.priority}
        options={PRIORITIES}
        tone={PRIORITY_TONE}
        disabled={!canEdit}
        onChange={(priority) => onPatch({ priority })}
      />

      <input
        type="date"
        aria-label="Due date"
        value={toDateInputValue(item.dueDate)}
        disabled={!canEdit}
        onChange={(event) =>
          onPatch({ dueDate: event.target.value === '' ? null : new Date(event.target.value) })
        }
        style={{
          border: '1px solid transparent',
          borderRadius: 'var(--radius)',
          background: 'transparent',
          padding: '5px 4px',
          font: 'inherit',
          fontSize: 'var(--text-base)',
          color: overdue ? 'var(--blocked)' : 'var(--ink-secondary)',
          fontWeight: overdue ? 600 : 400,
          colorScheme: 'light dark',
          width: '100%',
          minWidth: 0,
        }}
      />

      <MeetingCell meeting={item.nextMeeting} />

      <span className="row" style={{ gap: 2, justifySelf: 'end' }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onOpen}
          title="Open details"
          aria-label={`Open ${item.title}`}
          style={{ height: 26, padding: '0 8px', color: 'var(--accent)' }}
        >
          Details
        </button>

        {canEdit ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--icon"
            onClick={onSchedule}
            title="Schedule a meeting about this task"
            aria-label={`Schedule a meeting about ${item.title}`}
            style={{ height: 26, width: 26 }}
          >
            <CalendarIcon />
          </button>
        ) : null}

        {canEdit ? (
          <button
            type="button"
            aria-label={`Delete ${item.title}`}
            title="Delete task"
            onClick={onDelete}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontSize: 17,
              lineHeight: 1,
              padding: '0 4px',
              borderRadius: 'var(--radius-sm)',
              // Revealed on hover: an always-visible delete invites accidents.
              opacity: hovered ? 1 : 0,
              transition: 'opacity var(--transition)',
            }}
          >
            ×
          </button>
        ) : null}
      </span>
    </div>
  );
}
