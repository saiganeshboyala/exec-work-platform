import { paginationQuerySchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { activityController } from './activity.controller';

export const activityRouter = Router();

activityRouter.use(authenticate);

activityRouter.get(
  '/',
  authorize('MANAGER'),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(activityController.list),
);

activityRouter.get(
  '/:entityType/:entityId',
  authorize('MEMBER'),
  asyncHandler(activityController.listForEntity),
);
