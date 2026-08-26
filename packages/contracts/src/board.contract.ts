import { z } from 'zod';

export const createBoardSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(120).trim(),
  description: z.string().max(1000).trim().optional(),
  isPortfolio: z.boolean().default(false),
});
export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const updateBoardSchema = createBoardSchema.omit({ workspaceId: true }).partial();
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

export interface BoardDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isPortfolio: boolean;
  itemCount: number;
  createdAt: string;
}
