import { ITEM_STATUSES, PRIORITIES } from '@ewp/contracts';
import type { ItemDto, ItemStatus, Priority, UpdateItemInput } from '@ewp/contracts';
import { Link } from 'react-router-dom';

import { SelectCell } from '@/features/items';
import { Avatar } from '@/shared/components/Avatar';
import { CalendarIcon } from '@/shared/components/icons';
import { formatDateTime } from '@/shared/lib/format';
import { PRIORITY_TONE, STATUS_TONE, toDateInputValue } from '@/shared/lib/item-meta';

// The fixed columns must total well under the container or the flexible task
// column collapses to nothing. minmax keeps it readable at any width.
const GRID = 'minmax(220px, 2.2fr) 150px 170px 132px 120px 160px 92px';

/**
 * Every task the signed-in person can see, across departments. The board view
 * answers "what is happening here"; this answers "what is on my plate", which
 * is why it leads with the department rather than grouping by it.
 */
export function TodoTaskTable({
  items,
  canEdit,
  onPatch,
  onSchedule,
}: {
  items: ItemDto[];
  canEdit: boolean;
  onPatch: (id: string, patch: UpdateItemInput) => void;
  onSchedule: (item: ItemDto) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-7)' }}>
        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 500 }}>Nothing to do yet</p>
        <p className="meta" style={{ marginTop: 6 }}>
          Create a task above, or ask to be added to a department.
        </p>
      </div>
    );
  }

  return (
    <div className="card card--flush">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          gap: 'var(--space-2)',
          padding: '8px var(--space-4)',
          background: 'var(--surface-sunk)',
          borderBottom: '1px solid var(--line)',
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--ink-muted)',
          fontWeight: 600,
        }}
      >
        <span>Task</span>
        <span>Department</span>
        <span>Owner</span>
        <span style={{ textAlign: 'center' }}>Status</span>
        <span style={{ textAlign: 'center' }}>Priority</span>
        <span>Due</span>
        <span style={{ textAlign: 'right' }}>Actions</span>
      </div>

      {items.map((item) => {
        const overdue =
          item.dueDate !== null && item.status !== 'DONE' && new Date(item.dueDate) < new Date();

        return (
          <div
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 'var(--space-2)',
              alignItems: 'center',
              padding: '7px var(--space-4)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-md)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={item.title}
            >
              {item.status === 'BLOCKED' ? (
                <span style={{ color: 'var(--blocked)', marginRight: 5 }}>●</span>
              ) : null}
              {item.title}
            </span>

            <Link
              to={`/boards/${item.boardId}`}
              className="badge"
              style={{
                background: 'var(--neutral-wash)',
                color: 'var(--ink-secondary)',
                textDecoration: 'none',
                justifySelf: 'start',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
                whiteSpace: 'nowrap',
              }}
              title={item.boardName}
            >
              {item.boardName}
            </Link>

            <span className="row" style={{ gap: 6, minWidth: 0 }}>
              <Avatar id={item.owner?.id ?? null} fullName={item.owner?.fullName ?? null} size={22} />
              <span
                style={{
                  fontSize: 'var(--text-base)',
                  color: item.owner ? 'var(--ink)' : 'var(--ink-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.owner?.fullName ?? 'Unassigned'}
              </span>
            </span>

            <SelectCell<ItemStatus>
              ariaLabel="Status"
              value={item.status}
              options={ITEM_STATUSES}
              tone={STATUS_TONE}
              disabled={!canEdit}
              onChange={(status) => onPatch(item.id, { status })}
            />

            <SelectCell<Priority>
              ariaLabel="Priority"
              value={item.priority}
              options={PRIORITIES}
              tone={PRIORITY_TONE}
              disabled={!canEdit}
              onChange={(priority) => onPatch(item.id, { priority })}
            />

            <span className="row" style={{ gap: 4, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 'var(--text-base)',
                  color: overdue ? 'var(--blocked)' : 'var(--ink-secondary)',
                  fontWeight: overdue ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {toDateInputValue(item.dueDate) === '' ? '—' : toDateInputValue(item.dueDate)}
              </span>

              {item.nextMeeting ? (
                <span
                  className="badge"
                  title={`${item.nextMeeting.title} — ${formatDateTime(item.nextMeeting.startsAt)}`}
                  aria-label={`Meeting scheduled: ${item.nextMeeting.title}`}
                  style={{
                    background: 'var(--accent-wash)',
                    color: 'var(--accent)',
                    gap: 3,
                    padding: '2px 6px',
                    flexShrink: 0,
                  }}
                >
                  <CalendarIcon size={11} />
                  {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
                    new Date(item.nextMeeting.startsAt),
                  )}
                </span>
              ) : null}
            </span>

            <span className="row" style={{ gap: 2, justifySelf: 'end' }}>
              <Link
                to={`/boards/${item.boardId}?item=${item.id}`}
                className="btn btn--ghost btn--sm"
                style={{ height: 26, padding: '0 8px', color: 'var(--accent)' }}
              >
                Details
              </Link>

              {canEdit ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm btn--icon"
                  onClick={() => onSchedule(item)}
                  title="Schedule a meeting about this task"
                  aria-label={`Schedule a meeting about ${item.title}`}
                  style={{ height: 26, width: 26 }}
                >
                  <CalendarIcon />
                </button>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
