import {
  listMeetingsQuerySchema,
  meetingConflictQuerySchema,
  recordDecisionSchema,
  scheduleMeetingSchema,
} from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { meetingsController } from './meetings.controller';

export const meetingsRouter = Router();

meetingsRouter.use(authenticate);

meetingsRouter.get('/upcoming', authorize('VIEWER'), asyncHandler(meetingsController.listUpcoming));

// Declared before '/' so the literal path is not eaten by the range query.
meetingsRouter.get(
  '/conflicts',
  authorize('VIEWER'),
  validate(meetingConflictQuerySchema, 'query'),
  asyncHandler(meetingsController.conflicts),
);

meetingsRouter.get(
  '/',
  authorize('VIEWER'),
  validate(listMeetingsQuerySchema, 'query'),
  asyncHandler(meetingsController.list),
);

meetingsRouter.post(
  '/',
  authorize('MEMBER'),
  validate(scheduleMeetingSchema),
  asyncHandler(meetingsController.schedule),
);

// The service checks organiser-or-manager; MEMBER here just keeps viewers out.
meetingsRouter.delete('/:id', authorize('MEMBER'), asyncHandler(meetingsController.cancel));

meetingsRouter.post(
  '/:id/decisions',
  authorize('MANAGER'),
  validate(recordDecisionSchema),
  asyncHandler(meetingsController.recordDecision),
);
