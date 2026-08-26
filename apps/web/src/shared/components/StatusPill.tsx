import type { Health } from '@ewp/contracts';

const LABELS: Record<Health, string> = {
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  BLOCKED: 'Blocked',
  OVERDUE: 'Overdue',
};

const TONE: Record<Health, { color: string; wash: string }> = {
  ON_TRACK: { color: 'var(--on-track)', wash: 'var(--on-track-wash)' },
  AT_RISK: { color: 'var(--at-risk)', wash: 'var(--at-risk-wash)' },
  BLOCKED: { color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
  OVERDUE: { color: 'var(--blocked)', wash: 'var(--blocked-wash)' },
};

/** Health is the one thing an executive scans for, so it gets its own control. */
export function StatusPill({ health }: { health: Health }) {
  const tone = TONE[health];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        background: tone.wash,
        color: tone.color,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {LABELS[health]}
    </span>
  );
}

export function healthColor(health: Health): string {
  return TONE[health].color;
}
