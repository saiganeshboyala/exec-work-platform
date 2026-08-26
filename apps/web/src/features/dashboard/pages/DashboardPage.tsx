import { useState } from 'react';
import { Link } from 'react-router-dom';

import { QuickCreateTask } from '@/features/items';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonCards, SkeletonRows } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/lib/format';

import { DecisionQueue } from '../components/DecisionQueue';
import { KpiCard } from '../components/KpiCard';
import { PortfolioTable } from '../components/PortfolioTable';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';

export function DashboardPage() {
  const { data, isPending, error } = useExecutiveDashboard();
  const [creating, setCreating] = useState(false);

  if (isPending) {
    return (
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <SkeletonRows rows={1} height={44} />
        <SkeletonCards cards={4} />
        <SkeletonRows rows={5} height={48} />
      </div>
    );
  }
  if (error) return <ErrorNotice error={error} />;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Todo"
        subtitle={`Updated ${formatDateTime(data.generatedAt)}`}
        actions={
          <>
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              + Create task
            </button>
            <Link className="btn" to="/meetings">
              Meetings
            </Link>
          </>
        }
      />

      {creating ? <QuickCreateTask onClose={() => setCreating(false)} /> : null}

      <section
        aria-label="Key figures"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
      >
        <section className="card" style={{ padding: 'var(--space-5) 0 0' }}>
          <h2 className="card__title" style={{ padding: '0 var(--space-5)' }}>
            Portfolio health
          </h2>
          {data.portfolio.length === 0 ? (
            <EmptyState
              title="No open initiatives"
              body="Create a board and add the work your leadership team tracks."
            />
          ) : (
            <PortfolioTable rows={data.portfolio} />
          )}
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card__title">Needs your decision</h2>
            {data.decisionQueue.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>
                Nothing is waiting on you.
              </p>
            ) : (
              <DecisionQueue rows={data.decisionQueue} />
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Upcoming</h2>
            {data.upcomingMeetings.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>No meetings scheduled.</p>
            ) : (
              <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--space-2)' }}>
                {data.upcomingMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{meeting.title}</p>
                    <p className="meta">{formatDateTime(meeting.startsAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
