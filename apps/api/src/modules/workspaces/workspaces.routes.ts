import { createWorkspaceSchema, updateWorkspaceSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { workspacesController } from './workspaces.controller';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get('/', authorize('VIEWER'), asyncHandler(workspacesController.list));

workspacesRouter.post(
  '/',
  authorize('MANAGER'),
  validate(createWorkspaceSchema),
  asyncHandler(workspacesController.create),
);

workspacesRouter.patch(
  '/:id',
  authorize('MANAGER'),
  validate(updateWorkspaceSchema),
  asyncHandler(workspacesController.update),
);

workspacesRouter.delete('/:id', authorize('ADMIN'), asyncHandler(workspacesController.remove));
