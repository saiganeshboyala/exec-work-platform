import type { CalendarConnectionDto } from '@ewp/contracts';
import { Router, type Request, type Response } from 'express';

import { AppError } from '@/common/errors';
import { asyncHandler, sendNoContent, sendOk } from '@/common/http';
import { authenticate, authorize, requireAuth } from '@/common/middleware';
import { env } from '@/config';
import {
  buildAuthorizeUrl,
  completeOAuth,
  connectedEmail,
  disconnect,
  isGoogleConfigured,
} from '@/integrations/calendar';
import { signCalendarState, verifyCalendarState } from '@/modules/auth';

export const integrationsRouter = Router();

/**
 * The callback is hit by Google in a browser redirect, so it cannot carry a
 * bearer token. Identity travels instead in a signed, short-lived `state`
 * value minted here, which the callback verifies before storing anything.
 */
integrationsRouter.get(
  '/google/authorize',
  authenticate,
  authorize('MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = requireAuth(req);
    const state = signCalendarState({ userId: auth.userId, organizationId: auth.organizationId });
    sendOk(res, { url: buildAuthorizeUrl(state) });
  }),
);

integrationsRouter.get(
  '/google/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;

    if (req.query.error) {
      res.redirect(`${env.WEB_BASE_URL}/meetings?calendar=denied`);
      return;
    }
    if (!code || !state) throw AppError.badRequest('Google did not return an authorisation code');

    const claims = verifyCalendarState(state);
    await completeOAuth(code, claims.userId, claims.organizationId);

    // Hand the browser back to the app rather than rendering JSON at the user.
    res.redirect(`${env.WEB_BASE_URL}/meetings?calendar=connected`);
  }),
);

integrationsRouter.get(
  '/google/status',
  authenticate,
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = requireAuth(req);
    const email = env.CALENDAR_DRIVER === 'google' ? await connectedEmail(auth.userId) : null;

    const dto: CalendarConnectionDto = {
      provider: env.CALENDAR_DRIVER,
      configured: env.CALENDAR_DRIVER === 'google' && isGoogleConfigured(),
      connected: email !== null,
      connectedEmail: email,
    };
    sendOk(res, dto);
  }),
);

integrationsRouter.delete(
  '/google',
  authenticate,
  authorize('MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    await disconnect(requireAuth(req).userId);
    sendNoContent(res);
  }),
);
