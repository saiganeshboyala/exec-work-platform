import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { notesService } from './notes.service';

export const notesController = {
  async list(req: Request, res: Response): Promise<void> {
    sendOk(res, await notesService.list(requireAuth(req), req.query as ListNotesQuery));
  },

  async create(req: Request, res: Response): Promise<void> {
    sendCreated(res, await notesService.create(requireAuth(req), req.body as CreateNoteInput));
  },

  async update(req: Request, res: Response): Promise<void> {
    sendOk(
      res,
      await notesService.update(
        requireAuth(req),
        req.params.id as string,
        req.body as UpdateNoteInput,
      ),
    );
  },

  async remove(req: Request, res: Response): Promise<void> {
    await notesService.remove(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  },
};
