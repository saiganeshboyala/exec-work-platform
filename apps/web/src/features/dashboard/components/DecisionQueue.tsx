import type { DecisionQueueRowDto } from '@ewp/contracts';

import { pluralize } from '@/shared/lib/format';

/** Blocked work, oldest first. This is the executive's actual to-do list. */
export function DecisionQueue({ rows }: { rows: DecisionQueueRowDto[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="stack">
      {rows.map((row) => (
        <li key={row.itemId}>
          <p style={{ fontWeight: 500, fontSize: 14 }}>{row.title}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
            {row.blockedReason ?? 'No reason recorded'}
          </p>
          <p className="meta">
            {row.boardName} · waiting {pluralize(row.waitingSinceDays, 'day')}
          </p>
        </li>
      ))}
    </ul>
  );
}
