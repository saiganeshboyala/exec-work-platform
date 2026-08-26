import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Avatar } from '@/shared/components/Avatar';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/lib/format';

import { adminApi } from '../api/admin.api';

const VERB_TONE: Record<string, { color: string; wash: string }> = {
  CREATED: { color: 'var(--on-track)', wash: 'var(--on-track-wash)' },
  DELETED: { color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
  STATUS_CHANGED: { color: 'var(--accent)', wash: 'var(--accent-wash)' },
  ASSIGNED: { color: 'var(--at-risk)', wash: 'var(--at-risk-wash)' },
};

/** The audit trail was always being recorded; this is the first time it is readable. */
export function AuditPanel() {
  const [search, setSearch] = useState('');
  const audit = useQuery({ queryKey: ['audit'], queryFn: () => adminApi.audit(100) });

  if (audit.isPending) return <SkeletonRows rows={8} height={44} />;
  if (audit.error) return <ErrorNotice error={audit.error} />;

  const term = search.trim().toLowerCase();
  const rows = (audit.data ?? []).filter(
    (row) =>
      term === '' ||
      row.verb.toLowerCase().includes(term) ||
      row.entityType.toLowerCase().includes(term) ||
      (row.actor?.fullName ?? '').toLowerCase().includes(term),
  );

  return (
    <div className="stack">
      <input
        className="field__input"
        placeholder="Filter by person, verb or entity…"
        aria-label="Filter audit trail"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ maxWidth: 320 }}
      />

      <div className="card card--flush">
        {rows.map((row) => {
          const tone = VERB_TONE[row.verb] ?? { color: 'var(--neutral)', wash: 'var(--neutral-wash)' };

          return (
            <div
              key={row.id}
              className="row"
              style={{
                gap: 'var(--space-3)',
                padding: '10px var(--space-4)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <Avatar id={row.actor?.id ?? null} fullName={row.actor?.fullName ?? null} size={26} />

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--text-md)' }}>
                  <strong>{row.actor?.fullName ?? 'System'}</strong>{' '}
                  <span className="badge" style={{ background: tone.wash, color: tone.color }}>
                    {row.verb.toLowerCase().replace(/_/g, ' ')}
                  </span>{' '}
                  <span style={{ color: 'var(--ink-secondary)' }}>{row.entityType}</span>
                </span>
                <span className="meta" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                  {row.entityId}
                </span>
              </span>

              <span className="meta" style={{ whiteSpace: 'nowrap' }}>
                {formatDateTime(row.createdAt)}
              </span>
            </div>
          );
        })}

        {rows.length === 0 ? (
          <p className="meta" style={{ padding: 'var(--space-4)' }}>Nothing matches.</p>
        ) : null}
      </div>
    </div>
  );
}
