import type { PortfolioRowDto } from '@ewp/contracts';

import { healthColor, StatusPill } from '@/shared/components/StatusPill';
import { formatDate } from '@/shared/lib/format';

/**
 * Each row carries a coloured spine on its left edge. Health is therefore
 * legible without reading the pill, which is what makes the list scannable.
 */
export function PortfolioTable({ rows }: { rows: PortfolioRowDto[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((row) => (
        <li
          key={row.boardId}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto auto',
            alignItems: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-4)',
            borderLeft: `3px solid ${healthColor(row.health)}`,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.name}
            </p>
            <p className="meta">
              {row.openItems} open · {row.overdueItems} overdue · next {formatDate(row.nextMilestone)}
            </p>
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{row.ownerName ?? '—'}</span>
          <StatusPill health={row.health} />
        </li>
      ))}
    </ul>
  );
}
