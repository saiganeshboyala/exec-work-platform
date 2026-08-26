import { createBoardSchema, updateBoardSchema } from '@ewp/contracts';
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { boardsController } from './boards.controller';

export const boardsRouter = Router();

boardsRouter.use(authenticate);

boardsRouter.get(
  '/',
  authorize('VIEWER'),
  validate(z.object({ workspaceId: z.string().uuid() }), 'query'),
  asyncHandler(boardsController.list),
);

boardsRouter.get('/:id', authorize('VIEWER'), asyncHandler(boardsController.get));

boardsRouter.post(
  '/',
  authorize('MEMBER'),
  validate(createBoardSchema),
  asyncHandler(boardsController.create),
);

boardsRouter.patch(
  '/:id',
  authorize('MEMBER'),
  validate(updateBoardSchema),
  asyncHandler(boardsController.update),
);

boardsRouter.delete('/:id', authorize('MANAGER'), asyncHandler(boardsController.remove));
