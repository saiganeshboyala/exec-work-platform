import type { NoteDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { itemsApi } from '@/features/items';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/lib/format';

import { notesApi } from '../api/notes.api';

/**
 * A notebook. Two panes: the notes on the left, the open one on the right.
 *
 * Notes save on a pause rather than a button. A notebook that can lose what you
 * typed because you navigated away is not one anybody trusts, and a Save button
 * is a thing to forget - so the only visible state is "Saved" or "Saving".
 */
export function NotesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const notes = useQuery({
    queryKey: queryKeys.notes(search),
    queryFn: () => notesApi.list(search || undefined),
  });

  const open = notes.data?.find((note) => note.id === openId) ?? null;

  // Opening a different note replaces the draft; edits to the one already open
  // must not be thrown away by a background refetch.
  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }
    setDraft((current) => (current === null ? { title: open.title, body: open.body } : current));
  }, [open]);

  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['notes'] }).then(() => undefined);

  // Every task the writer can see, for the picker. The same list the rest of
  // the app uses, so a note can only be linked to work they could already open.
  const tasks = useQuery({ queryKey: ['items', 'all'], queryFn: itemsApi.listAll });

  const linkTask = useMutation({
    mutationFn: (next: { id: string; itemId: string | null }) =>
      notesApi.update(next.id, { itemId: next.itemId }),
    onSuccess: invalidate,
  });

  const create = useMutation({
    mutationFn: () => notesApi.create({ title: 'Untitled note', body: '', pinned: false }),
    onSuccess: async (note) => {
      setDraft({ title: note.title, body: note.body });
      setOpenId(note.id);
      setConfirmingDelete(false);
      await invalidate();
    },
  });

  const save = useMutation({
    mutationFn: (next: { id: string; title: string; body: string }) =>
      notesApi.update(next.id, { title: next.title.trim() || 'Untitled note', body: next.body }),
    onSuccess: invalidate,
  });

  const togglePin = useMutation({
    mutationFn: (note: NoteDto) => notesApi.update(note.id, { pinned: !note.pinned }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onSuccess: async () => {
      setOpenId(null);
      setDraft(null);
      setConfirmingDelete(false);
      await invalidate();
    },
  });

  // Saved on a pause in typing rather than on every keystroke, which would be a
  // request per letter, or on blur, which loses the last edit to a closed tab.
  useEffect(() => {
    if (!openId || !draft) return;
    if (open && draft.title === open.title && draft.body === open.body) return;

    setSaving(true);
    const timer = window.setTimeout(() => {
      save.mutate(
        { id: openId, ...draft },
        { onSettled: () => setSaving(false) },
      );
    }, 600);

    return () => window.clearTimeout(timer);
    // `save` and `open` are deliberately absent: this fires on what was typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, openId]);

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Notes"
        subtitle="Your own notebook. Nobody else can read these, whatever their role."
        actions={
          <button className="btn btn--primary" type="button" onClick={() => create.mutate()}>
            + New note
          </button>
        }
      />

      {notes.error ? <ErrorNotice error={notes.error} /> : null}
      {create.error ? <ErrorNotice error={create.error} /> : null}

      <div
        style={{
          display: 'grid',
          // One column on a narrow screen, two where there is room for both.
          gridTemplateColumns: 'minmax(0, 300px) minmax(0, 1fr)',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
        className="notes-layout"
      >
        <div className="stack" style={{ gap: 'var(--space-3)', minWidth: 0 }}>
          <input
            className="field__input"
            type="search"
            placeholder="Search notes…"
            aria-label="Search notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {notes.isPending ? (
            <SkeletonRows rows={4} height={64} />
          ) : notes.data && notes.data.length > 0 ? (
            <div className="stack" style={{ gap: 6 }}>
              {notes.data.map((note) => {
                const isOpen = note.id === openId;

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      setOpenId(note.id);
                      setDraft({ title: note.title, body: note.body });
                      setConfirmingDelete(false);
                    }}
                    className="card"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 'var(--space-3)',
                      borderColor: isOpen ? 'var(--accent)' : 'var(--line)',
                      background: isOpen ? 'var(--accent-wash)' : 'var(--surface)',
                      display: 'grid',
                      gap: 3,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {note.pinned ? '★ ' : ''}
                      {note.title}
                    </span>
                    <span
                      className="meta"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {note.body.trim() === '' ? 'Empty' : note.body}
                    </span>
                    <span className="meta" style={{ fontSize: 'var(--text-xs)' }}>
                      {note.itemTitle ? `◈ ${note.itemTitle} · ` : ''}
                      {formatDateTime(note.updatedAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="meta">
              {search
                ? `Nothing matches “${search}”.`
                : 'No notes yet. Start one with “New note”.'}
            </p>
          )}
        </div>

        {open && draft ? (
          <div className="card stack" style={{ gap: 'var(--space-3)', minWidth: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <input
                className="field__input"
                aria-label="Note title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                style={{ fontSize: 17, fontWeight: 500, flex: 1, minWidth: 0 }}
              />
              <span className="row" style={{ gap: 'var(--space-2)' }}>
                <button
                  className="btn btn--sm"
                  type="button"
                  aria-pressed={open.pinned}
                  onClick={() => togglePin.mutate(open)}
                  title={open.pinned ? 'Unpin this note' : 'Keep this note at the top'}
                >
                  {open.pinned ? '★ Pinned' : '☆ Pin'}
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  style={{ color: 'var(--blocked)' }}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete
                </button>
              </span>
            </div>

            <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className="meta" style={{ whiteSpace: 'nowrap' }}>
                Linked task
              </span>
              <select
                className="field__input"
                aria-label="Link this note to a task"
                value={open.itemId ?? ''}
                onChange={(event) =>
                  linkTask.mutate({ id: open.id, itemId: event.target.value || null })
                }
                style={{ flex: 1, minWidth: 180 }}
              >
                <option value="">Not linked</option>
                {tasks.data?.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {open.itemId ? (
                <Link className="btn btn--sm" to={`/?item=${open.itemId}`}>
                  Open task
                </Link>
              ) : null}
            </div>
            {linkTask.error ? <ErrorNotice error={linkTask.error} /> : null}

            <textarea
              className="field__input"
              aria-label="Note"
              placeholder="Write it down…"
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              rows={18}
            />

            <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span className="meta">
                {saving || save.isPending ? 'Saving…' : `Saved ${formatDateTime(open.updatedAt)}`}
              </span>
              {save.error ? <ErrorNotice error={save.error} /> : null}
            </div>

            {confirmingDelete ? (
              <div
                className="stack"
                style={{
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--blocked)',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--blocked)' }}>
                  Delete “{open.title}”?
                </p>
                <div className="row" style={{ gap: 'var(--space-2)' }}>
                  <button
                    className="btn btn--sm"
                    type="button"
                    style={{ color: 'var(--blocked)', borderColor: 'var(--blocked)' }}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(open.id)}
                  >
                    {remove.isPending ? 'Deleting…' : 'Yes, delete it'}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep it
                  </button>
                </div>
                {remove.error ? <ErrorNotice error={remove.error} /> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="card" style={{ minWidth: 0 }}>
            <p className="meta">Pick a note on the left, or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
