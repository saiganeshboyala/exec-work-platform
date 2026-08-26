import type { ItemDto, ItemStatus, MemberDto, UpdateItemInput } from '@ewp/contracts';
import { useState } from 'react';

import { pluralize } from '@/shared/lib/format';

import type { ItemGroup } from '../lib/group-items';

import { BOARD_GRID, ItemRow } from './ItemRow';

/**
 * One group of the board: a coloured header, its rows, and - when the grouping
 * is by status - an inline composer that creates straight into that status.
 */
export function ItemGroupTable({
  group,
  members,
  canEdit,
  selected,
  onSelect,
  onSelectMany,
  onOpen,
  onSchedule,
  onPatch,
  onDelete,
  onCreate,
}: {
  group: ItemGroup;
  members: MemberDto[];
  canEdit: boolean;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onSelectMany: (ids: string[], on: boolean) => void;
  onOpen: (item: ItemDto) => void;
  onSchedule: (item: ItemDto) => void;
  onPatch: (id: string, patch: UpdateItemInput) => void;
  onDelete: (id: string) => void;
  onCreate: (title: string, status: ItemStatus | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState('');

  const submit = (): void => {
    const title = draft.trim();
    if (title === '') return;
    onCreate(title, group.createStatus);
    setDraft('');
  };

  const allSelected = group.items.length > 0 && group.items.every((item) => selected.has(item.id));
  const someSelected = group.items.some((item) => selected.has(item.id));

  const done = group.items.filter((item) => item.status === 'DONE').length;
  const progress = group.items.length === 0 ? 0 : Math.round((done / group.items.length) * 100);

  return (
    <section>
      <div className="row" style={{ padding: '0 2px var(--space-2)', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="row"
          style={{ border: 'none', background: 'transparent', padding: 0, gap: 'var(--space-2)' }}
        >
          <span aria-hidden="true" style={{ color: 'var(--ink-muted)', fontSize: 10 }}>
            {open ? '▾' : '▸'}
          </span>
          <span style={{ color: group.color, fontWeight: 600, fontSize: 'var(--text-md)' }}>
            {group.label}
          </span>
          <span className="meta">{pluralize(group.items.length, 'task')}</span>
        </button>

        {group.items.length > 0 ? (
          <span className="row" style={{ gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                width: 56,
                height: 4,
                borderRadius: 999,
                background: 'var(--surface-sunk)',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${progress}%`,
                  height: '100%',
                  background: group.color,
                  transition: 'width var(--transition)',
                }}
              />
            </span>
            <span className="meta" style={{ fontSize: 'var(--text-xs)' }}>
              {progress}%
            </span>
          </span>
        ) : null}
      </div>

      {open ? (
        <div
          className="card card--flush"
          style={{ borderLeft: `3px solid ${group.color}` }}
        >
          {/* Column headings only earn their space above actual rows; an empty
              group collapses to its composer instead of repeating them. */}
          {group.items.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: BOARD_GRID,
                gap: 'var(--space-2)',
                padding: '7px var(--space-3)',
                background: 'var(--surface-sunk)',
                borderBottom: '1px solid var(--line)',
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-muted)',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                aria-label={`Select all in ${group.label}`}
                checked={allSelected}
                ref={(node) => {
                  // Partial selection reads as neither on nor off.
                  if (node) node.indeterminate = someSelected && !allSelected;
                }}
                onChange={(event) => onSelectMany(group.items.map((i) => i.id), event.target.checked)}
                style={{ justifySelf: 'center' }}
              />
              <span>Task</span>
              <span>People</span>
              <span style={{ textAlign: 'center' }}>Status</span>
              <span style={{ textAlign: 'center' }}>Priority</span>
              <span>Due</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>
          ) : null}

          {group.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              members={members}
              canEdit={canEdit}
              selected={selected.has(item.id)}
              onSelect={() => onSelect(item.id)}
              onOpen={() => onOpen(item)}
              onSchedule={() => onSchedule(item)}
              onPatch={(patch) => onPatch(item.id, patch)}
              onDelete={() => onDelete(item.id)}
            />
          ))}

          {group.items.length === 0 && !canEdit ? (
            <p className="meta" style={{ padding: 'var(--space-3)' }}>
              Nothing here.
            </p>
          ) : null}

          {canEdit ? (
            <div style={{ padding: '2px var(--space-3)' }}>
              <input
                value={draft}
                placeholder="+ Add task"
                aria-label={`Add a task to ${group.label}`}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={submit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                  if (event.key === 'Escape') setDraft('');
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  padding: '8px 6px',
                  font: 'inherit',
                  fontSize: 'var(--text-md)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
