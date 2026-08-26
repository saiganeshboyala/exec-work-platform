import { createSavedViewSchema, updateSavedViewSchema } from '@ewp/contracts';
import { Router, type Request, type Response } from 'express';

import { asyncHandler, sendCreated, sendNoContent, sendOk } from '@/common/http';
import { authenticate, authorize, requireAuth, validate } from '@/common/middleware';

import { viewsService } from './views.service';

export const viewsRouter = Router();

viewsRouter.use(authenticate);

viewsRouter.get(
  '/',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;
    sendOk(res, await viewsService.list(requireAuth(req), boardId));
  }),
);

viewsRouter.post(
  '/',
  authorize('VIEWER'),
  validate(createSavedViewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendCreated(res, await viewsService.create(requireAuth(req), req.body));
  }),
);

viewsRouter.patch(
  '/:id',
  authorize('VIEWER'),
  validate(updateSavedViewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendOk(res, await viewsService.update(requireAuth(req), req.params.id as string, req.body));
  }),
);

viewsRouter.delete(
  '/:id',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    await viewsService.remove(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  }),
);
