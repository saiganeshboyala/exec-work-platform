import type { Request, Response } from 'express';

import { env } from '@/config';

/**
 * The refresh token lives in a cookie the browser will not let JavaScript read.
 * Kept out of localStorage on purpose: any script that runs on the page can
 * read storage, so a single XSS there hands over a session for as long as the
 * token lasts. httpOnly means the browser attaches it and nothing else can see
 * it.
 *
 * The path scopes it to the auth endpoints, so it is not sent with every
 * request to the API - only the three that actually need it.
 */
export const REFRESH_COOKIE = 'ewp_refresh';
const COOKIE_PATH = '/api/v1/auth';

function maxAgeMs(): number {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_TTL);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  return value * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}

function options() {
  return {
    httpOnly: true,
    // Only over TLS in production. Left off locally, where the dev server is
    // plain http and the cookie would otherwise never be stored.
    secure: env.NODE_ENV === 'production',
    // The SPA and the API share an origin behind nginx, so lax is enough and
    // keeps the cookie off cross-site requests.
    sameSite: 'lax' as const,
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...options(), maxAge: maxAgeMs() });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, options());
}

/**
 * The cookie is the real source. The body is still read as a fallback so a
 * deploy does not sign out everyone mid-session, and so a non-browser client
 * can still refresh.
 */
export function readRefreshToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (fromCookie) return fromCookie;

  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  return fromBody ?? null;
}
