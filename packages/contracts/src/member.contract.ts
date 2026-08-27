import { z } from 'zod';

import { emailSchema } from './common';
import { ROLES, type InvitationStatus, type Role } from './enums';

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES).refine((r) => r !== 'OWNER', 'Ownership is transferred, not invited'),
  workspaceIds: z.array(z.string().uuid()).max(50).default([]),
  message: z.string().max(500).trim().optional(),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const bulkInviteSchema = z.object({
  invitations: z.array(inviteMemberSchema).min(1).max(50),
});
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;

export const changeRoleSchema = z.object({ role: z.enum(ROLES) });

export const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Approving is also where the newcomer's role is decided. */
export const approveMemberSchema = z.object({
  role: z.enum(ROLES).refine((r) => r !== 'OWNER', 'Ownership is transferred, not granted'),
});
export type ApproveMemberInput = z.infer<typeof approveMemberSchema>;

export interface PendingMemberDto {
  userId: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  requestedAt: string;
}
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

/** Job titles are collected at sign-up; this is how they get corrected later. */
export const changeJobTitleSchema = z.object({
  jobTitle: z.string().max(120).trim().nullable(),
});
export type ChangeJobTitleInput = z.infer<typeof changeJobTitleSchema>;

export interface MemberDto {
  userId: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  role: Role;
  status: MembershipStatus;
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  invitedBy: { id: string; fullName: string };
  emailDeliveredAt: string | null;
  expiresAt: string;
  createdAt: string;
}
