import type { CreateSavedViewInput, SavedViewDto, UpdateSavedViewInput } from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const viewsApi = {
  list: (boardId?: string) => apiRequest<SavedViewDto[]>('/views', { query: { boardId } }),
  create: (body: CreateSavedViewInput) =>
    apiRequest<SavedViewDto>('/views', { method: 'POST', body }),
  update: (id: string, body: UpdateSavedViewInput) =>
    apiRequest<SavedViewDto>(`/views/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => apiRequest<void>(`/views/${id}`, { method: 'DELETE' }),
};
