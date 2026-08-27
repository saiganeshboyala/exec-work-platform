import {
  acceptInvitationSchema,
  approveMemberSchema,
  changeJobTitleSchema,
  changeRoleSchema,
  inviteMemberSchema,
} from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, authRateLimit, validate } from '@/common/middleware';

import { membersController } from './members.controller';

export const membersRouter = Router();

// Public - the invitation token is the credential.
membersRouter.post(
  '/invitations/accept',
  authRateLimit,
  validate(acceptInvitationSchema),
  asyncHandler(membersController.acceptInvitation),
);

membersRouter.use(authenticate);

membersRouter.get('/pending', authorize('ADMIN'), asyncHandler(membersController.listPending));

membersRouter.post(
  '/pending/:userId/approve',
  authorize('ADMIN'),
  validate(approveMemberSchema),
  asyncHandler(membersController.approve),
);

membersRouter.post(
  '/pending/:userId/reject',
  authorize('ADMIN'),
  asyncHandler(membersController.reject),
);

membersRouter.get('/', authorize('VIEWER'), asyncHandler(membersController.list));

membersRouter.get(
  '/invitations',
  authorize('MANAGER'),
  asyncHandler(membersController.listInvitations),
);

membersRouter.post(
  '/invitations',
  authorize('MANAGER'),
  validate(inviteMemberSchema),
  asyncHandler(membersController.invite),
);

membersRouter.delete(
  '/invitations/:id',
  authorize('MANAGER'),
  asyncHandler(membersController.revokeInvitation),
);

membersRouter.patch(
  '/:userId/job-title',
  authorize('MANAGER'),
  validate(changeJobTitleSchema),
  asyncHandler(membersController.changeJobTitle),
);

membersRouter.patch(
  '/:userId/role',
  authorize('ADMIN'),
  validate(changeRoleSchema),
  asyncHandler(membersController.changeRole),
);

membersRouter.delete('/:userId', authorize('ADMIN'), asyncHandler(membersController.remove));
