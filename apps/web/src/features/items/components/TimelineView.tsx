import type { ItemDto } from '@ewp/contracts';
import { useMemo } from 'react';

import { Avatar } from '@/shared/components/Avatar';
import { STATUS_TONE } from '@/shared/lib/item-meta';

const DAY = 86_400_000;

/**
 * A Gantt-style read of the same rows. Items without dates are listed
 * separately rather than silently dropped, because "nobody has dated it" is
 * exactly the thing a planning view should surface.
 */
export function TimelineView({ items, onOpen }: { items: ItemDto[]; onOpen: (item: ItemDto) => void }) {
  const dated = items.filter((item) => item.startDate !== null || item.dueDate !== null);
  const undated = items.filter((item) => item.startDate === null && item.dueDate === null);

  const { start, days, months } = useMemo(() => {
    const stamps = dated.flatMap((item) =>
      [item.startDate, item.dueDate].filter(Boolean).map((iso) => new Date(iso as string).getTime()),
    );

    const now = Date.now();
    const min = stamps.length > 0 ? Math.min(...stamps) : now;
    const max = stamps.length > 0 ? Math.max(...stamps) : now + 30 * DAY;

    // A week of air either side so bars never touch the edge.
    const from = new Date(min - 7 * DAY);
    from.setHours(0, 0, 0, 0);
    const total = Math.max(Math.ceil((max + 7 * DAY - from.getTime()) / DAY), 30);

    // Month boundaries for the header ruler.
    const labels: Array<{ label: string; offset: number; width: number }> = [];
    let cursor = new Date(from);
    while (cursor.getTime() < from.getTime() + total * DAY) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const offset = Math.floor((monthStart.getTime() - from.getTime()) / DAY);
      const width = Math.min(
        Math.ceil((monthEnd.getTime() - monthStart.getTime()) / DAY),
        total - offset,
      );
      labels.push({
        label: new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(monthStart),
        offset,
        width,
      });
      cursor = monthEnd;
    }

    return { start: from, days: total, months: labels };
  }, [dated]);

  const todayOffset = Math.floor((Date.now() - start.getTime()) / DAY);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className="card card--flush" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 720 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `260px 1fr`,
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface-sunk)',
            }}
          >
            <span
              style={{
                padding: '7px var(--space-3)',
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-muted)',
                fontWeight: 600,
              }}
            >
              Task
            </span>

            <span style={{ position: 'relative', height: 30 }}>
              {months.map((month) => (
                <span
                  key={month.label + month.offset}
                  style={{
                    position: 'absolute',
                    left: `${(month.offset / days) * 100}%`,
                    width: `${(month.width / days) * 100}%`,
                    borderLeft: '1px solid var(--line)',
                    height: '100%',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-muted)',
                    padding: '7px 6px',
                    fontWeight: 600,
                  }}
                >
                  {month.label}
                </span>
              ))}
            </span>
          </div>

          {dated.map((item) => {
            const startMs = item.startDate
              ? new Date(item.startDate).getTime()
              : new Date(item.dueDate as string).getTime();
            const endMs = item.dueDate
              ? new Date(item.dueDate).getTime()
              : new Date(item.startDate as string).getTime();

            const offset = Math.max(Math.floor((startMs - start.getTime()) / DAY), 0);
            // A single-day task still needs a visible bar.
            const width = Math.max(Math.ceil((endMs - startMs) / DAY), 1);
            const tone = STATUS_TONE[item.status];

            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '260px 1fr',
                  borderBottom: '1px solid var(--line)',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="row"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '6px var(--space-3)',
                    gap: 6,
                    textAlign: 'left',
                    minWidth: 0,
                  }}
                >
                  <Avatar id={item.owner?.id ?? null} fullName={item.owner?.fullName ?? null} size={20} />
                  <span
                    style={{
                      fontSize: 'var(--text-base)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </span>
                </button>

                <span style={{ position: 'relative', height: 30 }}>
                  {todayOffset >= 0 && todayOffset <= days ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: `${(todayOffset / days) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: 'var(--accent)',
                        opacity: 0.35,
                      }}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    title={`${item.title} — ${tone.label}`}
                    style={{
                      position: 'absolute',
                      left: `${(offset / days) * 100}%`,
                      width: `${Math.max((width / days) * 100, 1.2)}%`,
                      top: 7,
                      height: 16,
                      borderRadius: 999,
                      border: 'none',
                      background: tone.color,
                      opacity: 0.85,
                    }}
                  />
                </span>
              </div>
            );
          })}

          {dated.length === 0 ? (
            <p className="meta" style={{ padding: 'var(--space-4)' }}>
              No tasks have dates yet.
            </p>
          ) : null}
        </div>
      </div>

      {undated.length > 0 ? (
        <div className="card">
          <p className="card__title">Not scheduled ({undated.length})</p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {undated.map((item) => (
              <button key={item.id} type="button" className="chip" onClick={() => onOpen(item)}>
                {item.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
