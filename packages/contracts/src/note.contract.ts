import { z } from 'zod';

/**
 * A note is somebody's own writing, so the only rule is that it says
 * something. A title alone is a valid note - most of them start that way and
 * are filled in later, and refusing to save one would lose the thought.
 */
export const createNoteSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().max(20_000).default(''),
  pinned: z.boolean().default(false),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/** Every field optional: the editor saves whichever one the writer touched. */
export const updateNoteSchema = z
  .object({
    title: z.string().min(1).max(200).trim().optional(),
    body: z.string().max(20_000).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to change',
  });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const listNotesQuerySchema = z.object({
  /** Matches title and body, so a half-remembered phrase finds the note. */
  search: z.string().max(200).trim().optional(),
});
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

export interface NoteDto {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
