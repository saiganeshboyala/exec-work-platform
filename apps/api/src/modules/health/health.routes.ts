import { Router } from 'express';

import { asyncHandler, sendOk } from '@/common/http';
import { prisma } from '@/database';
import { redisConnection } from '@/jobs';

export const healthRouter = Router();

/** Liveness: is the process up? Used by the container healthcheck. */
healthRouter.get('/live', (_req, res) => {
  sendOk(res, { status: 'ok', uptime: Math.round(process.uptime()) });
});

/** Readiness: can we serve traffic? Used by the load balancer. */
healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const [database, cache] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      redisConnection.ping(),
    ]);

    const checks = {
      database: database.status === 'fulfilled',
      cache: cache.status === 'fulfilled',
    };
    const ready = Object.values(checks).every(Boolean);

    sendOk(res, { status: ready ? 'ready' : 'degraded', checks }, ready ? 200 : 503);
  }),
);
