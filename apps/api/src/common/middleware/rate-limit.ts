import rateLimit from 'express-rate-limit';

import { ErrorCode } from '@/common/errors';
import { env } from '@/config';

const payload = (message: string) => ({
  success: false,
  error: { code: ErrorCode.RATE_LIMITED, message },
});

/** Broad limit applied to the whole API surface. */
export const globalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: payload('Too many requests. Try again shortly'),
});

/** Tight limit for credential endpoints - the ones worth brute forcing. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: payload('Too many attempts. Wait 15 minutes and try again'),
});
