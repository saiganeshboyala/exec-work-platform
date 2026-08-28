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
 * Nothing about the session is kept in storage. The refresh token is an
 * httpOnly cookie the browser holds and no script can read, and the access
 * token lives in memory for the life of the page - so an XSS on this origin
 * finds nothing to steal and cannot outlive the tab.
 */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Trades the stored refresh token for a new access token. The http client
  // calls this when a request comes back 401, so an expired access token is
  // renewed under the request rather than ending the session.
  const renew = useCallback(async (): Promise<string | null> => {
    try {
      const tokens = await authApi.refresh();
      setAccessToken(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      // No cookie, or it is spent or revoked; this session really is over.
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(clearSession);
    setSessionRefresher(renew);

    // There is nothing readable to check for a session, so ask: the cookie
    // either buys a new access token or it does not.
    void (async () => {
      try {
        const tokens = await authApi.refresh();
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
    setAccessToken(tokens.accessToken);
    setUser(signedIn);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    // Tells the server to revoke the token and clear the cookie.
    await authApi.logout().catch(() => undefined);
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
