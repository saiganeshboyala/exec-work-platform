import {
  ITEM_STATUSES,
  PRIORITIES,
  type ItemDto,
  type ItemStatus,
  type MemberDto,
  type Priority,
  type UpdateItemInput,
} from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Avatar } from '@/shared/components/Avatar';
import { CalendarIcon } from '@/shared/components/icons';
import { formatDateTime } from '@/shared/lib/format';
import { PRIORITY_TONE, STATUS_TONE, toDateInputValue } from '@/shared/lib/item-meta';

import { collabApi } from '../api/collab.api';

import { AssigneePicker } from './AssigneePicker';
import { SelectCell } from './SelectCell';

type Tab = 'details' | 'comments' | 'links' | 'activity';

/**
 * The full record for one task. A drawer rather than a route so the board stays
 * behind it: the point of this view is to check something and get back out.
 */
export function ItemDrawer({
  item,
  items,
  members,
  canEdit,
  onPatch,
  onSchedule,
  onClose,
}: {
  item: ItemDto;
  items: ItemDto[];
  members: MemberDto[];
  canEdit: boolean;
  onPatch: (patch: UpdateItemInput) => void;
  onSchedule?: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('details');
  const queryClient = useQueryClient();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const comments = useQuery({
    queryKey: ['comments', item.id],
    queryFn: () => collabApi.listComments(item.id),
    enabled: tab === 'comments',
  });

  const dependencies = useQuery({
    queryKey: ['dependencies', item.id],
    queryFn: () => collabApi.listDependencies(item.id),
    enabled: tab === 'links',
  });

  const activity = useQuery({
    queryKey: ['activity', item.id],
    queryFn: () => collabApi.activityFor(item.id),
    enabled: tab === 'activity',
  });

  const addComment = useMutation({
    mutationFn: (body: string) => collabApi.addComment({ itemId: item.id, body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', item.id] }),
  });

  const addDependency = useMutation({
    mutationFn: (blockingItemId: string) =>
      collabApi.addDependency({ blockedItemId: item.id, blockingItemId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dependencies', item.id] }),
  });

  const removeDependency = useMutation({
    mutationFn: (id: string) => collabApi.removeDependency(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dependencies', item.id] }),
  });

  const subitems = items.filter((candidate) => candidate.parentId === item.id);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16, 24, 40, 0.35)',
          zIndex: 'var(--z-modal)' as unknown as number,
        }}
      />

      <aside
        role="dialog"
        aria-label={item.title}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(560px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--line)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 550, lineHeight: 1.3 }}>
              {item.title}
            </h2>
            <span className="row" style={{ gap: 4 }}>
              {canEdit && onSchedule ? (
                <button className="btn btn--sm" onClick={onSchedule} title="Schedule a meeting about this task">
                  <CalendarIcon /> Meeting
                </button>
              ) : null}
              <button className="btn btn--ghost btn--sm btn--icon" onClick={onClose} aria-label="Close">
                ×
              </button>
            </span>
          </div>

          <nav className="row" style={{ gap: 2, marginTop: 'var(--space-3)' }}>
            {(
              [
                ['details', 'Details'],
                ['comments', 'Comments'],
                ['links', 'Dependencies'],
                ['activity', 'History'],
              ] as Array<[Tab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  border: 'none',
                  background: tab === key ? 'var(--accent-wash)' : 'transparent',
                  color: tab === key ? 'var(--accent)' : 'var(--ink-secondary)',
                  fontWeight: tab === key ? 600 : 400,
                  fontSize: 'var(--text-base)',
                  padding: '6px 11px',
                  borderRadius: 'var(--radius)',
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
          {tab === 'details' ? (
            <div className="stack">
              <Row label="Status">
                <SelectCell<ItemStatus>
                  ariaLabel="Status"
                  value={item.status}
                  options={ITEM_STATUSES}
                  tone={STATUS_TONE}
                  disabled={!canEdit}
                  onChange={(status) => onPatch({ status })}
                />
              </Row>

              <Row label="Priority">
                <SelectCell<Priority>
                  ariaLabel="Priority"
                  value={item.priority}
                  options={PRIORITIES}
                  tone={PRIORITY_TONE}
                  disabled={!canEdit}
                  onChange={(priority) => onPatch({ priority })}
                />
              </Row>

              <Row label="Owner">
                <select
                  className="field__input"
                  aria-label="Owner"
                  value={item.owner?.id ?? ''}
                  disabled={!canEdit}
                  onChange={(event) =>
                    onPatch({ ownerId: event.target.value === '' ? null : event.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Members">
                <AssigneePicker
                  assignees={item.assignees}
                  members={members}
                  ownerId={item.owner?.id ?? null}
                  disabled={!canEdit}
                  onChange={(assigneeIds) => onPatch({ assigneeIds })}
                />
              </Row>

              <Row label="Start">
                <input
                  className="field__input"
                  type="date"
                  aria-label="Start date"
                  value={toDateInputValue(item.startDate)}
                  disabled={!canEdit}
                  onChange={(event) =>
                    onPatch({ startDate: event.target.value === '' ? null : new Date(event.target.value) })
                  }
                />
              </Row>

              <Row label="Due">
                <input
                  className="field__input"
                  type="date"
                  aria-label="Due date"
                  value={toDateInputValue(item.dueDate)}
                  disabled={!canEdit}
                  onChange={(event) =>
                    onPatch({ dueDate: event.target.value === '' ? null : new Date(event.target.value) })
                  }
                />
              </Row>

              {item.status === 'BLOCKED' ? (
                <div className="field">
                  <label className="field__label" htmlFor="drawer-blocked">Why is it blocked?</label>
                  <textarea
                    id="drawer-blocked"
                    className="field__input"
                    style={{ height: 70, padding: 'var(--space-2) var(--space-3)' }}
                    defaultValue={item.blockedReason ?? ''}
                    disabled={!canEdit}
                    onBlur={(event) => {
                      if (event.target.value !== (item.blockedReason ?? '')) {
                        onPatch({ blockedReason: event.target.value || null });
                      }
                    }}
                  />
                </div>
              ) : null}

              <div className="field">
                <label className="field__label" htmlFor="drawer-description">Description</label>
                <textarea
                  id="drawer-description"
                  className="field__input"
                  style={{ height: 130, padding: 'var(--space-2) var(--space-3)', lineHeight: 1.5 }}
                  defaultValue={item.description ?? ''}
                  disabled={!canEdit}
                  placeholder="Context, links, acceptance criteria…"
                  onBlur={(event) => {
                    if (event.target.value !== (item.description ?? '')) {
                      onPatch({ description: event.target.value });
                    }
                  }}
                />
              </div>

              {subitems.length > 0 ? (
                <div>
                  <p className="card__title" style={{ marginBottom: 'var(--space-2)' }}>
                    Subitems ({subitems.length})
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {subitems.map((sub) => (
                      <li key={sub.id} className="row" style={{ padding: '5px 0', gap: 8 }}>
                        <span
                          className="badge"
                          style={{
                            background: STATUS_TONE[sub.status].wash,
                            color: STATUS_TONE[sub.status].color,
                          }}
                        >
                          {STATUS_TONE[sub.status].label}
                        </span>
                        <span style={{ fontSize: 'var(--text-base)' }}>{sub.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'comments' ? (
            <CommentsTab
              comments={comments.data ?? []}
              loading={comments.isPending}
              members={members}
              canEdit={canEdit}
              pending={addComment.isPending}
              onSubmit={(body) => addComment.mutate(body)}
            />
          ) : null}

          {tab === 'links' ? (
            <LinksTab
              item={item}
              items={items}
              dependencies={dependencies.data ?? []}
              loading={dependencies.isPending}
              canEdit={canEdit}
              error={addDependency.error}
              onAdd={(id) => addDependency.mutate(id)}
              onRemove={(id) => removeDependency.mutate(id)}
            />
          ) : null}

          {tab === 'activity' ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {(activity.data ?? []).map((entry) => (
                <li
                  key={entry.id}
                  style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--line)' }}
                >
                  <span style={{ fontSize: 'var(--text-base)' }}>
                    <strong>{entry.actor?.fullName ?? 'System'}</strong>{' '}
                    {entry.verb.toLowerCase().replace(/_/g, ' ')}
                  </span>
                  <span className="meta" style={{ display: 'block' }}>
                    {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
              {activity.data?.length === 0 ? <p className="meta">No history yet.</p> : null}
            </ul>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row" style={{ gap: 'var(--space-3)' }}>
      <span className="field__label" style={{ width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
    </div>
  );
}

function CommentsTab({
  comments,
  loading,
  members,
  canEdit,
  pending,
  onSubmit,
}: {
  comments: Array<{ id: string; body: string; author: { id: string; fullName: string }; createdAt: string }>;
  loading: boolean;
  members: MemberDto[];
  canEdit: boolean;
  pending: boolean;
  onSubmit: (body: string) => void;
}) {
  const [draft, setDraft] = useState('');

  /** Inserts the machine-readable mention the server parses. */
  const mention = (member: MemberDto): void =>
    setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@[${member.fullName}](${member.userId}) `);

  return (
    <div className="stack">
      {loading ? <p className="meta">Loading…</p> : null}

      {comments.map((comment) => (
        <div key={comment.id} className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          <Avatar id={comment.author.id} fullName={comment.author.fullName} size={26} />
          <div style={{ minWidth: 0 }}>
            <span className="row" style={{ gap: 6 }}>
              <strong style={{ fontSize: 'var(--text-base)' }}>{comment.author.fullName}</strong>
              <span className="meta" style={{ fontSize: 'var(--text-xs)' }}>
                {formatDateTime(comment.createdAt)}
              </span>
            </span>
            <p style={{ fontSize: 'var(--text-md)', whiteSpace: 'pre-wrap' }}>
              {comment.body.replace(/@\[([^\]]+)\]\([0-9a-fA-F-]{36}\)/g, '@$1')}
            </p>
          </div>
        </div>
      ))}

      {comments.length === 0 && !loading ? <p className="meta">No comments yet.</p> : null}

      {canEdit ? (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <textarea
            className="field__input"
            style={{ height: 80, padding: 'var(--space-2) var(--space-3)' }}
            placeholder="Write a comment. Use the buttons below to mention someone."
            aria-label="New comment"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            {members.slice(0, 6).map((member) => (
              <button
                key={member.userId}
                type="button"
                className="chip"
                style={{ height: 26 }}
                onClick={() => mention(member)}
              >
                @{member.fullName.split(' ')[0]}
              </button>
            ))}
          </div>
          <button
            className="btn btn--primary btn--sm"
            disabled={pending || draft.trim() === ''}
            onClick={() => {
              onSubmit(draft.trim());
              setDraft('');
            }}
          >
            {pending ? 'Posting…' : 'Comment'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LinksTab({
  item,
  items,
  dependencies,
  loading,
  canEdit,
  error,
  onAdd,
  onRemove,
}: {
  item: ItemDto;
  items: ItemDto[];
  dependencies: Array<{ id: string; blockedItemId: string; blockingItemId: string; otherTitle: string; otherStatus: ItemStatus }>;
  loading: boolean;
  canEdit: boolean;
  error: unknown;
  onAdd: (blockingItemId: string) => void;
  onRemove: (id: string) => void;
}) {
  const [choice, setChoice] = useState('');
  const blockedBy = dependencies.filter((dep) => dep.blockedItemId === item.id);
  const blocking = dependencies.filter((dep) => dep.blockingItemId === item.id);

  return (
    <div className="stack">
      {loading ? <p className="meta">Loading…</p> : null}

      <Section title="Blocked by" rows={blockedBy} canEdit={canEdit} onRemove={onRemove} />
      <Section title="Blocking" rows={blocking} canEdit={canEdit} onRemove={onRemove} />

      {canEdit ? (
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <select
            className="field__input"
            aria-label="Add a blocker"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Add something that blocks this…</option>
            {items
              .filter((candidate) => candidate.id !== item.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
          </select>
          <button
            className="btn btn--sm"
            disabled={choice === ''}
            onClick={() => {
              onAdd(choice);
              setChoice('');
            }}
          >
            Add
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="meta" style={{ color: 'var(--blocked)' }}>
          {(error as { message?: string }).message ?? 'Could not add that link.'}
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  rows,
  canEdit,
  onRemove,
}: {
  title: string;
  rows: Array<{ id: string; otherTitle: string; otherStatus: ItemStatus }>;
  canEdit: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <p className="card__title" style={{ marginBottom: 'var(--space-2)' }}>{title}</p>
      {rows.length === 0 ? (
        <p className="meta">Nothing.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((row) => (
            <li key={row.id} className="row" style={{ padding: '5px 0', gap: 8 }}>
              <span
                className="badge"
                style={{
                  background: STATUS_TONE[row.otherStatus].wash,
                  color: STATUS_TONE[row.otherStatus].color,
                }}
              >
                {STATUS_TONE[row.otherStatus].label}
              </span>
              <span style={{ fontSize: 'var(--text-base)', flex: 1 }}>{row.otherTitle}</span>
              {canEdit ? (
                <button className="btn btn--ghost btn--sm" onClick={() => onRemove(row.id)}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
