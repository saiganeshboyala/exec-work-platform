import { pushSubscribeSchema, pushUnsubscribeSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { notificationsController } from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', authorize('VIEWER'), asyncHandler(notificationsController.feed));

notificationsRouter.post(
  '/read',
  authorize('VIEWER'),
  asyncHandler(notificationsController.markAllRead),
);

notificationsRouter.get('/push/config', authorize('VIEWER'), notificationsController.config);

notificationsRouter.post(
  '/push/subscribe',
  authorize('VIEWER'),
  validate(pushSubscribeSchema),
  asyncHandler(notificationsController.subscribe),
);

notificationsRouter.post(
  '/push/unsubscribe',
  authorize('VIEWER'),
  validate(pushUnsubscribeSchema),
  asyncHandler(notificationsController.unsubscribe),
);
