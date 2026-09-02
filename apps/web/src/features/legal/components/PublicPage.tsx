import { Link } from 'react-router-dom';

/**
 * The shell for the pages that have to be readable without an account.
 *
 * Google's review of a sensitive scope will not accept a login wall: a
 * reviewer has to reach the homepage, the privacy policy and the terms while
 * signed out, from the same domain as the OAuth redirect.
 */
export function PublicPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div
          className="row"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: 'var(--space-4)',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <Link
            to="/welcome"
            style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)', textDecoration: 'none' }}
          >
            Todo
          </Link>
          <nav className="row" style={{ gap: 'var(--space-3)' }}>
            <Link className="meta" to="/privacy" style={{ textDecoration: 'none' }}>
              Privacy
            </Link>
            <Link className="meta" to="/terms" style={{ textDecoration: 'none' }}>
              Terms
            </Link>
            <Link className="btn btn--sm" to="/sign-in" style={{ textDecoration: 'none' }}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main
        className="stack"
        style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-6) var(--space-4)', gap: 'var(--space-4)' }}
      >
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{title}</h1>
          {intro ? <p style={{ color: 'var(--ink-secondary)' }}>{intro}</p> : null}
        </div>

        {children}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--line)',
          marginTop: 'var(--space-6)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          className="row"
          style={{ maxWidth: 760, margin: '0 auto', gap: 'var(--space-3)', flexWrap: 'wrap' }}
        >
          <span className="meta">CIS Technologies</span>
          <Link className="meta" to="/privacy" style={{ textDecoration: 'none' }}>
            Privacy policy
          </Link>
          <Link className="meta" to="/terms" style={{ textDecoration: 'none' }}>
            Terms of service
          </Link>
          <a className="meta" href="mailto:support@fyxo.ai" style={{ textDecoration: 'none' }}>
            support@fyxo.ai
          </a>
        </div>
      </footer>
    </div>
  );
}

/** A titled block of prose. Kept here so the three pages read consistently. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="stack" style={{ gap: 'var(--space-2)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{heading}</h2>
      {children}
    </section>
  );
}
