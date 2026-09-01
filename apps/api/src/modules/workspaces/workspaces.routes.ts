import { createWorkspaceSchema, updateWorkspaceSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { workspacesController } from './workspaces.controller';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get('/', authorize('VIEWER'), asyncHandler(workspacesController.list));

// A member with no workspace has nowhere to put a department, and so no way
// to raise a task at all. Renaming and deleting stay with managers.
workspacesRouter.post(
  '/',
  authorize('MEMBER'),
  validate(createWorkspaceSchema),
  asyncHandler(workspacesController.create),
);

workspacesRouter.patch(
  '/:id',
  authorize('MANAGER'),
  validate(updateWorkspaceSchema),
  asyncHandler(workspacesController.update),
);

// Same bar as a department: scoped by what the caller can see, not by rank.
workspacesRouter.delete('/:id', authorize('MEMBER'), asyncHandler(workspacesController.remove));
