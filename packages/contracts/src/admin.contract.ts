import { z } from 'zod';

import { ITEM_STATUSES, PRIORITIES, ROLES, type Role } from './enums';

/* ---- Custom fields ------------------------------------------------------ */

export const FIELD_TYPES = ['TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'SELECT', 'USER', 'CHECKBOX'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const createFieldSchema = z.object({
  boardId: z.string().uuid().nullable().optional(),
  label: z.string().min(1).max(80).trim(),
  type: z.enum(FIELD_TYPES),
  /** SELECT needs `options`; CURRENCY takes an ISO code. */
  config: z
    .object({
      options: z.array(z.string().max(60)).max(30).optional(),
      currency: z.string().length(3).optional(),
    })
    .optional(),
});
export type CreateFieldInput = z.infer<typeof createFieldSchema>;

export const setFieldValueSchema = z.object({
  itemId: z.string().uuid(),
  fieldId: z.string().uuid(),
  value: z.unknown(),
});
export type SetFieldValueInput = z.infer<typeof setFieldValueSchema>;

export interface FieldDefinitionDto {
  id: string;
  boardId: string | null;
  key: string;
  label: string;
  type: FieldType;
  config: { options?: string[]; currency?: string } | null;
  position: number;
}

/* ---- Automations -------------------------------------------------------- */

export const AUTOMATION_TRIGGERS = [
  'STATUS_CHANGED',
  'OWNER_CHANGED',
  'DUE_DATE_APPROACHING',
  'ITEM_CREATED',
] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_ACTIONS = [
  'NOTIFY_OWNER',
  'NOTIFY_USER',
  'SET_STATUS',
  'SET_PRIORITY',
  'ASSIGN_OWNER',
] as const;
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

export const createAutomationSchema = z.object({
  boardId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(140).trim(),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  condition: z
    .object({
      status: z.enum(ITEM_STATUSES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      withinDays: z.number().int().min(0).max(90).optional(),
    })
    .optional(),
  action: z.enum(AUTOMATION_ACTIONS),
  actionConfig: z
    .object({
      userId: z.string().uuid().optional(),
      status: z.enum(ITEM_STATUSES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      message: z.string().max(300).optional(),
    })
    .optional(),
  enabled: z.boolean().default(true),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const updateAutomationSchema = createAutomationSchema.partial().omit({ boardId: true });
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;

export interface AutomationDto {
  id: string;
  boardId: string | null;
  name: string;
  trigger: AutomationTrigger;
  condition: Record<string, unknown> | null;
  action: AutomationAction;
  actionConfig: Record<string, unknown> | null;
  enabled: boolean;
  lastRunAt: string | null;
  runCount: number;
}

/* ---- Scoped access ------------------------------------------------------ */

export const grantAccessSchema = z
  .object({
    userId: z.string().uuid(),
    workspaceId: z.string().uuid().nullable().optional(),
    boardId: z.string().uuid().nullable().optional(),
    role: z.enum(ROLES),
  })
  .refine((v) => Boolean(v.workspaceId) !== Boolean(v.boardId), {
    message: 'Grant access to exactly one of a workspace or a board',
    path: ['boardId'],
  });
export type GrantAccessInput = z.infer<typeof grantAccessSchema>;

export interface ScopedAccessDto {
  id: string;
  user: { id: string; fullName: string; email: string };
  workspaceId: string | null;
  boardId: string | null;
  scopeName: string;
  role: Role;
  createdAt: string;
}

/* ---- Workload ----------------------------------------------------------- */

export interface WorkloadRowDto {
  userId: string;
  fullName: string;
  open: number;
  overdue: number;
  dueThisWeek: number;
  critical: number;
  /** Open items weighted by priority - a crude but honest capacity signal. */
  load: number;
}
