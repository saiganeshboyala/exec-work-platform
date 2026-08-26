interface EmptyStateProps {
  title: string;
  body: string;
  action?: React.ReactNode;
}

/** An empty screen is an invitation to act, not an apology. */
export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-5)', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-2)' }}>
        {title}
      </p>
      <p style={{ color: 'var(--ink-secondary)', maxWidth: 380, margin: '0 auto var(--space-4)' }}>
        {body}
      </p>
      {action}
    </div>
  );
}
