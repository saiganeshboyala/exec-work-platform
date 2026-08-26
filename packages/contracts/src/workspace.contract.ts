import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  description: z.string().max(1000).trim().optional(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = createWorkspaceSchema.partial();
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export interface WorkspaceDto {
  id: string;
  name: string;
  description: string | null;
  boardCount: number;
  memberCount: number;
  createdAt: string;
}
