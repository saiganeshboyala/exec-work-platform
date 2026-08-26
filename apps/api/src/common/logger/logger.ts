import pino from 'pino';

import { env, isProduction } from '@/config';

/**
 * Structured JSON logs in production, human-readable in development.
 * Secrets are redacted centrally so no caller has to remember.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      '*.passwordHash',
      '*.tokenHash',
    ],
    censor: '[redacted]',
  },
  transport: isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

export type Logger = typeof logger;
