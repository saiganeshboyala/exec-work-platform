import { z } from 'zod';

import { ITEM_STATUSES, PRIORITIES, type ActivityVerb } from './enums';

/* ---- Comments ----------------------------------------------------------- */

export const createCommentSchema = z.object({
  itemId: z.string().uuid(),
  body: z.string().min(1).max(5000).trim(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({ body: z.string().min(1).max(5000).trim() });
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export interface CommentDto {
  id: string;
  itemId: string;
  body: string;
  author: { id: string; fullName: string };
  mentionedIds: string[];
  editedAt: string | null;
  createdAt: string;
}

/* ---- Dependencies ------------------------------------------------------- */

export const createDependencySchema = z.object({
  blockedItemId: z.string().uuid(),
  blockingItemId: z.string().uuid(),
});
export type CreateDependencyInput = z.infer<typeof createDependencySchema>;

export interface DependencyDto {
  id: string;
  blockedItemId: string;
  blockingItemId: string;
  /** Denormalised so the drawer can render without a second round trip. */
  otherTitle: string;
  otherStatus: (typeof ITEM_STATUSES)[number];
}

/* ---- Bulk actions ------------------------------------------------------- */

export const bulkUpdateItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(200),
  patch: z
    .object({
      status: z.enum(ITEM_STATUSES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      ownerId: z.string().uuid().nullable().optional(),
      dueDate: z.coerce.date().nullable().optional(),
      blockedReason: z.string().max(500).nullable().optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0, 'Choose at least one change'),
});
export type BulkUpdateItemsInput = z.infer<typeof bulkUpdateItemsSchema>;

export const bulkDeleteItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(200),
});
export type BulkDeleteItemsInput = z.infer<typeof bulkDeleteItemsSchema>;

export interface BulkResultDto {
  updated: number;
}

/* ---- Activity ----------------------------------------------------------- */

export interface ActivityDto {
  id: string;
  entityType: string;
  entityId: string;
  verb: ActivityVerb;
  actor: { id: string; fullName: string } | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}
