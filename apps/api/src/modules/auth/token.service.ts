import { createHash, randomBytes } from 'node:crypto';

import type { AuthTokens, Role } from '@ewp/contracts';
import jwt, { type SignOptions } from 'jsonwebtoken';

import type { AuthContext } from '@/common/types/express';
import { env } from '@/config';

interface AccessTokenClaims {
  sub: string;
  org: string;
  role: Role;
}

function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  return value * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}

export function signAccessToken(context: AuthContext): string {
  const claims: AccessTokenClaims = {
    sub: context.userId,
    org: context.organizationId,
    role: context.role,
  };
  // The TTL is validated as a duration string at boot; jsonwebtoken types it as
  // a literal union that a runtime-supplied string cannot satisfy.
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    issuer: 'ewp-api',
  };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AuthContext {
  const claims = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'ewp-api' }) as AccessTokenClaims;
  return { userId: claims.sub, organizationId: claims.org, role: claims.role };
}

interface CalendarStateClaims {
  userId: string;
  organizationId: string;
}

/**
 * An OAuth redirect cannot carry an Authorization header, so identity rides in
 * the `state` parameter instead. Signing it is what stops an attacker pinning
 * their own Google account onto somebody else's user id; the short TTL keeps a
 * leaked URL from being replayable later.
 */
export function signCalendarState(claims: CalendarStateClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: '10m', issuer: 'ewp-calendar' });
}

export function verifyCalendarState(state: string): CalendarStateClaims {
  return jwt.verify(state, env.JWT_ACCESS_SECRET, {
    issuer: 'ewp-calendar',
  }) as CalendarStateClaims;
}

/**
 * Refresh tokens are opaque random strings, not JWTs: they must be revocable.
 * Only the SHA-256 hash is stored, so a database leak cannot mint sessions.
 */
export function createRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(48).toString('base64url');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlToSeconds(env.JWT_REFRESH_TTL) * 1000),
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildTokenPair(context: AuthContext, refreshToken: string): AuthTokens {
  return {
    accessToken: signAccessToken(context),
    refreshToken,
    expiresIn: ttlToSeconds(env.JWT_ACCESS_TTL),
  };
}
