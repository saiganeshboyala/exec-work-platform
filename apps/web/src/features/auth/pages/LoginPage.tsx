import { passwordSchema } from '@ewp/contracts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/shared/api/http-client';

import { authApi } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';

type Mode = 'signIn' | 'signUp';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchTo = (next: Mode): void => {
    setMode(next);
    setError(null);
    setSubmitted(null);
    setPassword('');
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === 'signIn') {
        await signIn({ email, password });
        navigate('/', { replace: true });
        return;
      }

      // Check the shared policy before the round trip so the rule is stated
      // once and the person sees it immediately.
      const check = passwordSchema.safeParse(password);
      if (!check.success) {
        setError(check.error.issues[0]?.message ?? 'Choose a stronger password');
        return;
      }

      const result = await authApi.signUp({
        fullName,
        email,
        password,
        ...(jobTitle.trim() !== '' ? { jobTitle: jobTitle.trim() } : {}),
      });

      setSubmitted(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That did not work. Try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-5)',
      }}
    >
      <div className="card" style={{ width: 'min(420px, 100%)' }}>
        <p className="meta" style={{ marginBottom: 'var(--space-2)' }}>CIS Technologies</p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            fontWeight: 400,
            lineHeight: 1.15,
            marginBottom: 'var(--space-4)',
          }}
        >
          {mode === 'signIn' ? 'Sign in to CIS Technologies' : 'Request an account'}
        </h1>

        {submitted ? (
          <div
            role="status"
            className="stack"
            style={{
              background: 'var(--on-track-wash)',
              border: '1px solid var(--on-track)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              gap: 'var(--space-2)',
            }}
          >
            <p style={{ color: 'var(--on-track)', fontWeight: 600 }}>Request sent</p>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--ink-secondary)' }}>{submitted}</p>
            <button className="btn" onClick={() => switchTo('signIn')}>
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="stack" noValidate>
              {mode === 'signUp' ? (
                <>
                  <div className="field">
                    <label className="field__label" htmlFor="fullName">Full name</label>
                    <input
                      id="fullName"
                      className="field__input"
                      autoComplete="name"
                      placeholder="Priya Raghavan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="jobTitle">
                      Job title <span className="meta">optional</span>
                    </label>
                    <input
                      id="jobTitle"
                      className="field__input"
                      autoComplete="organization-title"
                      placeholder="Head of Operations"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                </>
              ) : null}

              <div className="field">
                <label className="field__label" htmlFor="email">Work email</label>
                <input
                  id="email"
                  className="field__input"
                  type="email"
                  autoComplete="username"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="field__input"
                  type="password"
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {mode === 'signUp' ? (
                  <p className="meta">
                    At least 12 characters, with an uppercase letter, a lowercase letter and a
                    number.
                  </p>
                ) : null}
              </div>

              {error ? <p className="field__error" role="alert">{error}</p> : null}

              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy
                  ? mode === 'signIn'
                    ? 'Signing in…'
                    : 'Sending…'
                  : mode === 'signIn'
                    ? 'Sign in'
                    : 'Request access'}
              </button>
            </form>

            <p
              className="meta"
              style={{ marginTop: 'var(--space-4)', textAlign: 'center', lineHeight: 1.6 }}
            >
              {mode === 'signIn' ? (
                <>
                  No account yet?{' '}
                  <button
                    type="button"
                    onClick={() => switchTo('signUp')}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Request access
                  </button>
                  <br />
                  An administrator approves new accounts.
                </>
              ) : (
                <>
                  Already approved?{' '}
                  <button
                    type="button"
                    onClick={() => switchTo('signIn')}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
