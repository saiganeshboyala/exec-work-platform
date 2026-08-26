import { createItemSchema, listItemsQuerySchema, updateItemSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { itemsController } from './items.controller';

export const itemsRouter = Router();

itemsRouter.use(authenticate);

itemsRouter.get(
  '/',
  authorize('VIEWER'),
  validate(listItemsQuerySchema, 'query'),
  asyncHandler(itemsController.list),
);

itemsRouter.get('/:id', authorize('VIEWER'), asyncHandler(itemsController.get));

itemsRouter.post(
  '/',
  authorize('MEMBER'),
  validate(createItemSchema),
  asyncHandler(itemsController.create),
);

itemsRouter.patch(
  '/:id',
  authorize('MEMBER'),
  validate(updateItemSchema),
  asyncHandler(itemsController.update),
);

itemsRouter.delete('/:id', authorize('MEMBER'), asyncHandler(itemsController.remove));
