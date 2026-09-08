import { z } from 'zod';

import { ITEM_STATUSES, PRIORITIES } from './enums';

export const GROUP_BY = ['none', 'status', 'owner', 'priority', 'due'] as const;
export type GroupBy = (typeof GROUP_BY)[number];

export const DUE_WINDOWS = ['any', 'overdue', 'today', 'week', 'none'] as const;
export type DueWindow = (typeof DUE_WINDOWS)[number];

/**
 * When the task is next being discussed, as opposed to when it is due. The two
 * are different questions - "what am I in a room about tomorrow" is not
 * answered by a due date - so they filter independently.
 */
export const MEETING_WINDOWS = [
  'any',
  'scheduled',
  'none',
  'today',
  'tomorrow',
  'week',
] as const;
export type MeetingWindow = (typeof MEETING_WINDOWS)[number];

/**
 * The filter shape is defined once here and stored verbatim on SavedView, so
 * the client and the server never disagree about what a saved view means.
 */
export const boardFiltersSchema = z.object({
  search: z.string().max(200).default(''),
  ownerId: z.string().default('any'),
  priority: z.enum([...PRIORITIES, 'any']).default('any'),
  status: z.enum([...ITEM_STATUSES, 'any']).default('any'),
  due: z.enum(DUE_WINDOWS).default('any'),
  // Defaulted, so a view saved before this existed still parses.
  meeting: z.enum(MEETING_WINDOWS).default('any'),
  groupBy: z.enum(GROUP_BY).default('none'),
  hideDone: z.boolean().default(false),
});
export type BoardFilters = z.infer<typeof boardFiltersSchema>;

export const createSavedViewSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  boardId: z.string().uuid().nullable().optional(),
  filters: boardFiltersSchema,
  /** Shared views are visible to the whole organisation. */
  shared: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});
export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;

export const updateSavedViewSchema = createSavedViewSchema.partial().omit({ boardId: true });
export type UpdateSavedViewInput = z.infer<typeof updateSavedViewSchema>;

export interface SavedViewDto {
  id: string;
  name: string;
  boardId: string | null;
  filters: BoardFilters;
  shared: boolean;
  isDefault: boolean;
  createdAt: string;
}
