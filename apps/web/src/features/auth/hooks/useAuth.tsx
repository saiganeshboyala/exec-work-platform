import type { LoginInput, SessionUserDto } from '@ewp/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  setAccessToken,
  setSessionRefresher,
  setUnauthenticatedHandler,
} from '@/shared/api/http-client';

import { authApi } from '../api/auth.api';

interface AuthState {
  user: SessionUserDto | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * The refresh token is the long-lived credential, so it is the only thing kept
 * in storage. The access token stays in memory and is re-minted on load, which
 * keeps a stolen storage dump from being directly usable against the API.
 */
const REFRESH_KEY = 'ewp.refreshToken';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  const clearSession = useCallback(() => {
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Trades the stored refresh token for a new access token. The http client
  // calls this when a request comes back 401, so an expired access token is
  // renewed under the request rather than ending the session.
  const renew = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) return null;

    try {
      const tokens = await authApi.refresh(stored);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
      setAccessToken(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      // The refresh token is spent or revoked; this session really is over.
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(clearSession);
    setSessionRefresher(renew);

    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) {
      setStatus('anonymous');
      return;
    }

    void (async () => {
      try {
        const tokens = await authApi.refresh(stored);
        localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        setAccessToken(tokens.accessToken);
        setUser(await authApi.me());
        setStatus('authenticated');
      } catch {
        clearSession();
      }
    })();

    return () => setSessionRefresher(null);
  }, [clearSession, renew]);

  const signIn = useCallback(async (input: LoginInput) => {
    const { user: signedIn, tokens } = await authApi.login(input);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setUser(signedIn);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (stored) await authApi.logout(stored).catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthState>(
    () => ({ user, status, signIn, signOut }),
    [user, status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
