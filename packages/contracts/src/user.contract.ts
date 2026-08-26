import { z } from 'zod';

import type { Role } from './enums';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  createdAt: string;
}

export interface SessionUserDto extends UserDto {
  organizationId: string;
  organizationName: string;
  role: Role;
}

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).trim().optional(),
  jobTitle: z.string().max(120).trim().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
