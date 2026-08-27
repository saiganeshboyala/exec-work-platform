import { z } from 'zod';

import { paginationQuerySchema } from './common';
import { HEALTH, ITEM_STATUSES, PRIORITIES, type Health, type ItemStatus, type Priority } from './enums';

export const createItemSchema = z.object({
  boardId: z.string().uuid(),
  title: z.string().min(1).max(300).trim(),
  description: z.string().max(10_000).trim().optional(),
  status: z.enum(ITEM_STATUSES).default('NOT_STARTED'),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  ownerId: z.string().uuid().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  /** Everyone else working on this, alongside the accountable owner. */
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema
  .partial()
  // boardId is updatable: moving a task to another department is an edit like
  // any other. The service checks the target is one the caller can reach.
  .extend({ blockedReason: z.string().max(500).trim().nullable().optional() });
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const listItemsQuerySchema = paginationQuerySchema.extend({
  boardId: z.string().uuid().optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  health: z.enum(HEALTH).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().max(200).trim().optional(),
  dueBefore: z.coerce.date().optional(),
});
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export interface ItemDto {
  id: string;
  boardId: string;
  /** Denormalised so cross-board views can show where a task lives. */
  boardName: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  health: Health;
  priority: Priority;
  owner: { id: string; fullName: string; avatarUrl: string | null } | null;
  /** Additional members on the task. Excludes the owner. */
  assignees: Array<{ id: string; fullName: string; avatarUrl: string | null }>;
  startDate: string | null;
  dueDate: string | null;
  blockedReason: string | null;
  /** Earliest upcoming meeting this task is on the agenda for, if any. */
  nextMeeting: { id: string; title: string; startsAt: string; joinUrl: string | null } | null;
  parentId: string | null;
  subitemCount: number;
  createdAt: string;
  updatedAt: string;
}
