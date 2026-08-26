import { ApiError } from '@/shared/api/http-client';

/** Says what happened and what to do. Never apologises, never shows a stack. */
export function ErrorNotice({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError ? error.message : 'That did not load. Refresh to try again';
  const requestId = error instanceof ApiError ? error.requestId : undefined;

  return (
    <div
      role="alert"
      style={{
        background: 'var(--blocked-wash)',
        border: '1px solid rgba(166,54,47,0.25)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-3) var(--space-4)',
        color: 'var(--blocked)',
        fontSize: 14,
      }}
    >
      {message}
      {requestId ? <div className="meta" style={{ marginTop: 4 }}>Reference {requestId}</div> : null}
    </div>
  );
}
