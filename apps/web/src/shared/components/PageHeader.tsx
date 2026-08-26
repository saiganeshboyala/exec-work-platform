import type { ReactNode } from 'react';

/**
 * Every page opens the same way: an optional breadcrumb, a serif title, one
 * line of context, and actions pinned right. Consistency here is most of what
 * makes an app feel considered rather than assembled.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0 }}>
        {breadcrumb ? <div style={{ marginBottom: 2 }}>{breadcrumb}</div> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? (
          <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-md)', marginTop: 2 }}>
            {subtitle}
          </p>
        ) : null}
      </div>

      {actions ? <div className="row">{actions}</div> : null}
    </header>
  );
}
