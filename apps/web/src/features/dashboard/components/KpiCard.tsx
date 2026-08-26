import type { KpiDto } from '@ewp/contracts';

const TONE: Record<KpiDto['key'], { color: string; wash: string }> = {
  activeInitiatives: { color: 'var(--ink)', wash: 'var(--neutral-wash)' },
  onTrackRate: { color: 'var(--on-track)', wash: 'var(--on-track-wash)' },
  atRisk: { color: 'var(--at-risk)', wash: 'var(--at-risk-wash)' },
  overdue: { color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
};

/**
 * The signature of this interface: numbers set large in the display serif, so
 * the four figures that matter read from across a room. A tinted rule at the
 * top carries the status colour without shouting it.
 */
export function KpiCard({ kpi }: { kpi: KpiDto }) {
  const tone = TONE[kpi.key];

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <span aria-hidden="true" style={{ height: 3, background: tone.color, opacity: 0.9 }} />

      <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-5)' }}>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
          }}
        >
          {kpi.label}
        </p>

        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 46,
            lineHeight: 1.05,
            marginTop: 2,
            color: tone.color,
          }}
        >
          {kpi.value}
          {kpi.unit === 'percent' ? <span style={{ fontSize: 24 }}>%</span> : null}
        </p>

        {kpi.delta !== null ? (
          <span
            className="badge"
            style={{
              marginTop: 'var(--space-2)',
              background: tone.wash,
              color: tone.color,
            }}
          >
            {kpi.delta > 0 ? '▲' : kpi.delta < 0 ? '▼' : '■'} {Math.abs(kpi.delta)} vs last week
          </span>
        ) : null}
      </div>
    </div>
  );
}
