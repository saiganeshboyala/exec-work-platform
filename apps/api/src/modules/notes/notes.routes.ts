import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authorize, validate } from '@/common/middleware';

import { notesController } from './notes.controller';

export const notesRouter = Router();

notesRouter.use(authenticate);

// VIEWER throughout: a notebook is not a privilege, and the service keys every
// query on the author, so nobody reaches a note that is not their own.
notesRouter.get(
  '/',
  authorize('VIEWER'),
  validate(listNotesQuerySchema, 'query'),
  asyncHandler(notesController.list),
);

notesRouter.post(
  '/',
  authorize('VIEWER'),
  validate(createNoteSchema),
  asyncHandler(notesController.create),
);

notesRouter.patch(
  '/:id',
  authorize('VIEWER'),
  validate(updateNoteSchema),
  asyncHandler(notesController.update),
);

notesRouter.delete('/:id', authorize('VIEWER'), asyncHandler(notesController.remove));
