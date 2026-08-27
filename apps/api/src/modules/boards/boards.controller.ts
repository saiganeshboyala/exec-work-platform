import type { CreateBoardInput, UpdateBoardInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { boardsService } from './boards.service';

export const boardsController = {
  async list(req: Request, res: Response): Promise<void> {
    const auth = requireAuth(req);
    const workspaceId = req.query.workspaceId as string | undefined;
    // No workspace means "every department I can see", which is what a picker
    // that has to offer a move between workspaces needs.
    sendOk(
      res,
      workspaceId
        ? await boardsService.listForWorkspace(auth, workspaceId)
        : await boardsService.listAll(auth),
    );
  },

  async get(req: Request, res: Response): Promise<void> {
    sendOk(res, await boardsService.get(requireAuth(req), req.params.id as string));
  },

  async create(req: Request, res: Response): Promise<void> {
    sendCreated(
      res,
      await boardsService.create(requireAuth(req), req.body as CreateBoardInput, req.requestId),
    );
  },

  async update(req: Request, res: Response): Promise<void> {
    sendOk(
      res,
      await boardsService.update(
        requireAuth(req),
        req.params.id as string,
        req.body as UpdateBoardInput,
        req.requestId,
      ),
    );
  },

  async remove(req: Request, res: Response): Promise<void> {
    await boardsService.remove(requireAuth(req), req.params.id as string, req.requestId);
    sendNoContent(res);
  },
};
