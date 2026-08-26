export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="meta" style={{ padding: 'var(--space-4)' }}>
      {label}…
    </p>
  );
}
