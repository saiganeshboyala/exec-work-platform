import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { itemsApi } from '@/features/items';
import { queryKeys } from '@/shared/api/query-keys';
import { Avatar } from '@/shared/components/Avatar';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { formatDueDate } from '@/shared/lib/format';
import { PRIORITY_TONE, STATUS_TONE } from '@/shared/lib/item-meta';

const GRID = 'minmax(180px, 2fr) 160px 128px 108px 116px';

/**
 * What is inside a department, shown under the cards rather than by leaving the
 * page for it. Read-only on purpose: this answers "what is in here" in one
 * click, and the department itself is one more click away for changing things.
 */
export function DepartmentPeek({ boardId, boardName }: { boardId: string; boardName: string }) {
  const items = useQuery({
    queryKey: queryKeys.boardItems(boardId),
    queryFn: () => itemsApi.listForBoard(boardId),
  });

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-sunk)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{boardName}</h2>
        <Link className="btn btn--sm" to={`/boards/${boardId}`}>
          Open department
        </Link>
      </div>

      {items.isPending ? (
        <div style={{ padding: 'var(--space-4)' }}>
          <SkeletonRows rows={3} height={36} />
        </div>
      ) : items.error ? (
        <div style={{ padding: 'var(--space-4)' }}>
          <ErrorNotice error={items.error} />
        </div>
      ) : items.data.length === 0 ? (
        <p className="meta" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          Nothing in this department yet.
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 'var(--space-2)',
              padding: '7px var(--space-4)',
              borderBottom: '1px solid var(--line)',
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-muted)',
              fontWeight: 600,
            }}
          >
            <span>Task</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due</span>
          </div>

          {items.data.map((item) => (
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
                {item.title}
              </span>

              <span className="row" style={{ gap: 6, minWidth: 0 }}>
                <Avatar
                  id={item.owner?.id ?? null}
                  fullName={item.owner?.fullName ?? null}
                  size={20}
                />
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

              <span
                className="badge"
                style={{
                  justifySelf: 'start',
                  background: STATUS_TONE[item.status].wash,
                  color: STATUS_TONE[item.status].color,
                }}
              >
                {STATUS_TONE[item.status].label}
              </span>

              <span
                className="badge"
                style={{
                  justifySelf: 'start',
                  background: PRIORITY_TONE[item.priority].wash,
                  color: PRIORITY_TONE[item.priority].color,
                }}
              >
                {PRIORITY_TONE[item.priority].label}
              </span>

              <span
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--ink-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDueDate(item.dueDate)}
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
