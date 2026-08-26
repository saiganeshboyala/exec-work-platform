/** Values shared by database, API and UI. Changing one of these is a migration. */

export const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

/** Higher number wins. Used by the authorize middleware and the UI alike. */
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 10,
  GUEST: 20,
  MEMBER: 30,
  MANAGER: 40,
  ADMIN: 50,
  OWNER: 60,
};

export const ITEM_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const HEALTH = ['ON_TRACK', 'AT_RISK', 'BLOCKED', 'OVERDUE'] as const;
export type Health = (typeof HEALTH)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const ACTIVITY_VERBS = [
  'CREATED',
  'UPDATED',
  'DELETED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'COMMENTED',
  'INVITED',
  'JOINED',
  'SCHEDULED',
] as const;
export type ActivityVerb = (typeof ACTIVITY_VERBS)[number];
