import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { workspacesService } from './workspaces.service';

export const workspacesController = {
  async list(req: Request, res: Response): Promise<void> {
    sendOk(res, await workspacesService.list(requireAuth(req)));
  },

  async create(req: Request, res: Response): Promise<void> {
    const dto = await workspacesService.create(
      requireAuth(req),
      req.body as CreateWorkspaceInput,
      req.requestId,
    );
    sendCreated(res, dto);
  },

  async update(req: Request, res: Response): Promise<void> {
    const dto = await workspacesService.update(
      requireAuth(req),
      req.params.id as string,
      req.body as UpdateWorkspaceInput,
      req.requestId,
    );
    sendOk(res, dto);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await workspacesService.remove(requireAuth(req), req.params.id as string, req.requestId);
    sendNoContent(res);
  },
};
