import type {
  ApproveMemberInput,
  ChangeRoleInput,
  InvitationDto,
  InviteMemberInput,
  MemberDto,
  PendingMemberDto,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const membersApi = {
  setJobTitle: (userId: string, jobTitle: string | null) =>
    apiRequest<MemberDto>(`/members/${userId}/job-title`, { method: 'PATCH', body: { jobTitle } }),

  listPending: () => apiRequest<PendingMemberDto[]>('/members/pending'),
  approve: (userId: string, body: ApproveMemberInput) =>
    apiRequest<MemberDto>(`/members/pending/${userId}/approve`, { method: 'POST', body }),
  reject: (userId: string) =>
    apiRequest<void>(`/members/pending/${userId}/reject`, { method: 'POST' }),
  list: () => apiRequest<MemberDto[]>('/members'),
  listInvitations: () => apiRequest<InvitationDto[]>('/members/invitations'),
  invite: (body: InviteMemberInput) =>
    apiRequest<InvitationDto>('/members/invitations', { method: 'POST', body }),
  revokeInvitation: (id: string) =>
    apiRequest<void>(`/members/invitations/${id}`, { method: 'DELETE' }),
  changeRole: (userId: string, body: ChangeRoleInput) =>
    apiRequest<MemberDto>(`/members/${userId}/role`, { method: 'PATCH', body }),
  remove: (userId: string) => apiRequest<void>(`/members/${userId}`, { method: 'DELETE' }),
};
