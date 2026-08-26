import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { logger } from '@/common/logger';
import { errorHandler, globalRateLimit, notFoundHandler, requestContext } from '@/common/middleware';
import { env } from '@/config';
import { v1Router } from '@/routes';

/**
 * Assembles the HTTP application. Kept free of side effects (no listening, no
 * database connection) so integration tests can import it directly.
 *
 * Middleware order matters: context -> security -> parsing -> routes -> errors.
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestContext);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as { requestId: string }).requestId }));

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: env.WEB_BASE_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(globalRateLimit);

  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
