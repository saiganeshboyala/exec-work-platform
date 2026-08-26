import { createAutomationSchema, updateAutomationSchema } from '@ewp/contracts';
import { Router, type Request, type Response } from 'express';

import { asyncHandler, sendCreated, sendNoContent, sendOk } from '@/common/http';
import { authenticate, authorize, requireAuth, validate } from '@/common/middleware';

import { automationsService } from './automations.service';

export const automationsRouter = Router();

automationsRouter.use(authenticate);

automationsRouter.get(
  '/',
  authorize('MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;
    sendOk(res, await automationsService.list(requireAuth(req), boardId));
  }),
);

automationsRouter.post(
  '/',
  authorize('ADMIN'),
  validate(createAutomationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendCreated(res, await automationsService.create(requireAuth(req), req.body));
  }),
);

automationsRouter.patch(
  '/:id',
  authorize('ADMIN'),
  validate(updateAutomationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendOk(res, await automationsService.update(requireAuth(req), req.params.id as string, req.body));
  }),
);

automationsRouter.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    await automationsService.remove(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  }),
);
