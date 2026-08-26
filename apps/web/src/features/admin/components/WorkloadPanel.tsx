import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/shared/components/Avatar';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';

import { adminApi } from '../api/admin.api';

/** Who is carrying what, sorted heaviest first. */
export function WorkloadPanel() {
  const workload = useQuery({ queryKey: ['workload'], queryFn: () => adminApi.workload() });

  if (workload.isPending) return <SkeletonRows rows={5} height={52} />;
  if (workload.error) return <ErrorNotice error={workload.error} />;

  const rows = workload.data ?? [];
  const peak = Math.max(...rows.map((row) => row.load), 1);

  return (
    <div className="card card--flush">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 90px 110px 90px 200px',
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
        <span>Person</span>
        <span style={{ textAlign: 'right' }}>Open</span>
        <span style={{ textAlign: 'right' }}>Overdue</span>
        <span style={{ textAlign: 'right' }}>This week</span>
        <span style={{ textAlign: 'right' }}>Critical</span>
        <span>Load</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.userId}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 90px 110px 90px 200px',
            gap: 'var(--space-2)',
            alignItems: 'center',
            padding: '10px var(--space-4)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <span className="row" style={{ gap: 8 }}>
            <Avatar id={row.userId} fullName={row.fullName} size={26} />
            <span style={{ fontSize: 'var(--text-md)' }}>{row.fullName}</span>
          </span>

          <span style={{ textAlign: 'right', fontSize: 'var(--text-md)' }}>{row.open}</span>
          <span
            style={{
              textAlign: 'right',
              fontSize: 'var(--text-md)',
              color: row.overdue > 0 ? 'var(--blocked)' : 'var(--ink-muted)',
              fontWeight: row.overdue > 0 ? 600 : 400,
            }}
          >
            {row.overdue}
          </span>
          <span style={{ textAlign: 'right', fontSize: 'var(--text-md)' }}>{row.dueThisWeek}</span>
          <span
            style={{
              textAlign: 'right',
              fontSize: 'var(--text-md)',
              color: row.critical > 0 ? 'var(--at-risk)' : 'var(--ink-muted)',
            }}
          >
            {row.critical}
          </span>

          <span className="row" style={{ gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                background: 'var(--surface-sunk)',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${(row.load / peak) * 100}%`,
                  height: '100%',
                  background:
                    row.load > peak * 0.75
                      ? 'var(--blocked)'
                      : row.load > peak * 0.4
                        ? 'var(--at-risk)'
                        : 'var(--on-track)',
                }}
              />
            </span>
            <span className="meta">{row.load}</span>
          </span>
        </div>
      ))}

      {rows.length === 0 ? <p className="meta" style={{ padding: 'var(--space-4)' }}>No members yet.</p> : null}
    </div>
  );
}
