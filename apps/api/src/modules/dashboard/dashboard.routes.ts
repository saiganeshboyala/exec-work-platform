import { dashboardQuerySchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/executive',
  authorize('VIEWER'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(dashboardController.executive),
);
