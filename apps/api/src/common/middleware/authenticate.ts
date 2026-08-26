import type { NextFunction, Request, Response } from 'express';

import { AppError } from '@/common/errors';
// Imported from token.service rather than the module index on purpose: the auth
// index also exports authRouter, and auth.routes imports this middleware. Going
// through the index would form a load cycle that leaves `authenticate`
// undefined at import time. token.service only depends on config and types.
// eslint-disable-next-line no-restricted-imports
import { verifyAccessToken } from '@/modules/auth/token.service';

/**
 * Reads the bearer token, verifies it and attaches the auth context.
 * Route handlers may then rely on `req.auth` being present.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');

  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthenticated());
    return;
  }

  try {
    req.auth = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(AppError.unauthenticated('Your session expired. Sign in again'));
  }
}

/** Narrowing helper so services never have to re-check for undefined. */
export function requireAuth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) throw AppError.unauthenticated();
  return req.auth;
}
