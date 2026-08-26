import {
  bulkDeleteItemsSchema,
  bulkUpdateItemsSchema,
  createCommentSchema,
  createDependencySchema,
  type BulkDeleteItemsInput,
  type BulkUpdateItemsInput,
} from '@ewp/contracts';
import { Router, type Request, type Response } from 'express';

import { asyncHandler, sendCreated, sendNoContent, sendOk } from '@/common/http';
import { authenticate, authorize, requireAuth, validate } from '@/common/middleware';
import { itemsService } from '@/modules/items';

import { commentsService } from './comments.service';
import { dependenciesService } from './dependencies.service';

export const collaborationRouter = Router();

collaborationRouter.use(authenticate);

/* ---- Comments ----------------------------------------------------------- */

collaborationRouter.get(
  '/comments',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    const itemId = String(req.query.itemId ?? '');
    sendOk(res, await commentsService.list(requireAuth(req), itemId));
  }),
);

collaborationRouter.post(
  '/comments',
  authorize('MEMBER'),
  validate(createCommentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendCreated(
      res,
      await commentsService.create(requireAuth(req), req.body, req.requestId),
    );
  }),
);

collaborationRouter.delete(
  '/comments/:id',
  authorize('MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    await commentsService.remove(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  }),
);

/* ---- Dependencies ------------------------------------------------------- */

collaborationRouter.get(
  '/dependencies',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    const itemId = String(req.query.itemId ?? '');
    sendOk(res, await dependenciesService.listFor(requireAuth(req), itemId));
  }),
);

collaborationRouter.post(
  '/dependencies',
  authorize('MEMBER'),
  validate(createDependencySchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendCreated(res, await dependenciesService.create(requireAuth(req), req.body));
  }),
);

collaborationRouter.delete(
  '/dependencies/:id',
  authorize('MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    await dependenciesService.remove(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  }),
);

/* ---- Bulk actions ------------------------------------------------------- */

collaborationRouter.post(
  '/items/bulk-update',
  authorize('MEMBER'),
  validate(bulkUpdateItemsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { itemIds, patch } = req.body as BulkUpdateItemsInput;
    sendOk(
      res,
      await itemsService.bulkUpdate(requireAuth(req), itemIds, patch, req.requestId),
    );
  }),
);

collaborationRouter.post(
  '/items/bulk-delete',
  authorize('MEMBER'),
  validate(bulkDeleteItemsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { itemIds } = req.body as BulkDeleteItemsInput;
    sendOk(res, await itemsService.bulkRemove(requireAuth(req), itemIds, req.requestId));
  }),
);
