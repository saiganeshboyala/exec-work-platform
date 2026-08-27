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
  hasCalendarScope,
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
  // Connecting your own calendar affects nobody else, so any signed-in person
  // may do it. MEMBER was needlessly locking out viewers and guests.
  authorize('VIEWER'),
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
      // Google's own reason is far more useful than a generic failure: the
      // common one is access_denied because the app is still in Testing and
      // this person is not on the tester list.
      const reason = typeof req.query.error === 'string' ? req.query.error : 'denied';
      res.redirect(`${env.WEB_BASE_URL}/meetings?calendar=denied&reason=${encodeURIComponent(reason)}`);
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
      // Only worth asking Google once there is a connection to ask about.
      canWriteEvents: email === null ? null : await hasCalendarScope(auth.userId),
    };
    sendOk(res, dto);
  }),
);

integrationsRouter.delete(
  '/google',
  authenticate,
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    await disconnect(requireAuth(req).userId);
    sendNoContent(res);
  }),
);
