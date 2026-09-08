import type { Health, PortfolioRowDto } from '@ewp/contracts';

import { formatDate } from '@/shared/lib/format';

const TONE: Record<Health, { color: string; wash: string }> = {
  ON_TRACK: { color: 'var(--on-track)', wash: 'var(--on-track-wash)' },
  AT_RISK: { color: 'var(--at-risk)', wash: 'var(--at-risk-wash)' },
  BLOCKED: { color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
  OVERDUE: { color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
};

/**
 * A department, in the shape the KPI cards used to occupy: a tinted rule
 * carrying its health, its open count set large, and what is actually pressing
 * underneath.
 *
 * Clickable, because a figure you cannot act on is decoration - selecting one
 * filters the table below to that department.
 */
export function DepartmentCard({
  row,
  selected,
  onSelect,
}: {
  row: PortfolioRowDto;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = TONE[row.health];

  return (
    <button
      type="button"
      className="card"
      aria-pressed={selected}
      onClick={onSelect}
      title={`Show only ${row.name}`}
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
        color: 'var(--ink)',
        minWidth: 0,
        borderColor: selected ? 'var(--accent)' : 'var(--line)',
        boxShadow: selected ? 'var(--ring)' : undefined,
      }}
    >
      <span aria-hidden="true" style={{ height: 3, background: tone.color, opacity: 0.9 }} />

      <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)', minWidth: 0 }}>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.name}
        </p>

        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 34,
            lineHeight: 1.1,
            marginTop: 2,
            color: row.overdueItems > 0 ? tone.color : 'var(--ink)',
          }}
        >
          {row.openItems}
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--ink-muted)' }}> open</span>
        </p>

        {/* Whichever of these is true is the thing worth knowing about the
            department at a glance; overdue work outranks the next date. */}
        <p className="meta" style={{ marginTop: 2 }}>
          {row.overdueItems > 0 ? (
            <span style={{ color: 'var(--blocked)', fontWeight: 600 }}>
              {row.overdueItems} overdue
            </span>
          ) : row.nextMilestone ? (
            <>next {formatDate(row.nextMilestone)}</>
          ) : (
            'nothing overdue'
          )}
        </p>
      </div>
    </button>
  );
}
