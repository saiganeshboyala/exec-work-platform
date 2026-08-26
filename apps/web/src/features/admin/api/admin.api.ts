import type {
  ActivityDto,
  AutomationDto,
  CreateAutomationInput,
  CreateFieldInput,
  FieldDefinitionDto,
  GrantAccessInput,
  ScopedAccessDto,
  UpdateAutomationInput,
  WorkloadRowDto,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const adminApi = {
  workload: (workspaceId?: string) =>
    apiRequest<WorkloadRowDto[]>('/admin/workload', { query: { workspaceId } }),

  audit: (take = 60) => apiRequest<ActivityDto[]>('/admin/audit', { query: { take } }),

  listFields: (boardId?: string) =>
    apiRequest<FieldDefinitionDto[]>('/admin/fields', { query: { boardId } }),
  createField: (body: CreateFieldInput) =>
    apiRequest<FieldDefinitionDto>('/admin/fields', { method: 'POST', body }),
  removeField: (id: string) => apiRequest<void>(`/admin/fields/${id}`, { method: 'DELETE' }),

  listAccess: () => apiRequest<ScopedAccessDto[]>('/admin/access'),
  grantAccess: (body: GrantAccessInput) =>
    apiRequest<ScopedAccessDto>('/admin/access', { method: 'POST', body }),
  revokeAccess: (id: string) => apiRequest<void>(`/admin/access/${id}`, { method: 'DELETE' }),

  listAutomations: () => apiRequest<AutomationDto[]>('/automations'),
  createAutomation: (body: CreateAutomationInput) =>
    apiRequest<AutomationDto>('/automations', { method: 'POST', body }),
  updateAutomation: (id: string, body: UpdateAutomationInput) =>
    apiRequest<AutomationDto>(`/automations/${id}`, { method: 'PATCH', body }),
  removeAutomation: (id: string) => apiRequest<void>(`/automations/${id}`, { method: 'DELETE' }),
};
