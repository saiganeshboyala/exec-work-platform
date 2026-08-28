import type {
  AuthTokens,
  ClientAuthTokens,
  LoginInput,
  RegisterInput,
  SignUpInput,
} from '@ewp/contracts';
import type { Request, Response } from 'express';

import { AppError } from '@/common/errors';
import { sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { authService } from './auth.service';
import { clearRefreshCookie, readRefreshToken, setRefreshCookie } from './refresh-cookie';

/**
 * The refresh token goes to the browser as an httpOnly cookie and is stripped
 * from the body, so no script on the page can read it.
 */
function withCookie<T extends { tokens: AuthTokens }>(res: Response, payload: T) {
  setRefreshCookie(res, payload.tokens.refreshToken);
  return { ...payload, tokens: forBrowser(payload.tokens) };
}

/** Everything the browser is allowed to see. The refresh token is not on it. */
function forBrowser(tokens: AuthTokens): ClientAuthTokens {
  return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
}

function meta(req: Request) {
  return { userAgent: req.header('user-agent'), ipAddress: req.ip, requestId: req.requestId };
}

export const authController = {
  async signUp(req: Request, res: Response): Promise<void> {
    sendOk(res, await authService.signUp(req.body as SignUpInput, req.requestId));
  },

  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput, meta(req));
    sendCreated(res, withCookie(res, result));
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput, meta(req));
    sendOk(res, withCookie(res, result));
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const token = readRefreshToken(req);
    if (!token) throw AppError.unauthenticated('No session to refresh');

    const tokens = await authService.refresh(token, meta(req));
    setRefreshCookie(res, tokens.refreshToken);
    sendOk(res, forBrowser(tokens));
  },

  async logout(req: Request, res: Response): Promise<void> {
    const token = readRefreshToken(req);
    // Clear the cookie either way: a caller asking to log out should end up
    // logged out even if the token was already spent.
    clearRefreshCookie(res);
    if (token) await authService.logout(token);
    sendNoContent(res);
  },

  async me(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    sendOk(res, await authService.currentUser(userId));
  },
};
