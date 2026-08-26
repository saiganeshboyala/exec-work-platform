import type { CreateItemInput, ListItemsQuery, UpdateItemInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { buildPageMeta, sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { itemsService } from './items.service';

export const itemsController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListItemsQuery;
    const { items, total } = await itemsService.list(requireAuth(req), query);
    sendOk(res, items, 200, buildPageMeta(query.page, query.pageSize, total));
  },

  async get(req: Request, res: Response): Promise<void> {
    sendOk(res, await itemsService.get(requireAuth(req), req.params.id as string));
  },

  async create(req: Request, res: Response): Promise<void> {
    sendCreated(
      res,
      await itemsService.create(requireAuth(req), req.body as CreateItemInput, req.requestId),
    );
  },

  async update(req: Request, res: Response): Promise<void> {
    sendOk(
      res,
      await itemsService.update(
        requireAuth(req),
        req.params.id as string,
        req.body as UpdateItemInput,
        req.requestId,
      ),
    );
  },

  async remove(req: Request, res: Response): Promise<void> {
    await itemsService.remove(requireAuth(req), req.params.id as string, req.requestId);
    sendNoContent(res);
  },
};
