import type { CreateNoteInput, NoteDto, UpdateNoteInput } from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const notesApi = {
  list: (search?: string) => apiRequest<NoteDto[]>('/notes', { query: { search } }),

  create: (body: CreateNoteInput) => apiRequest<NoteDto>('/notes', { method: 'POST', body }),

  update: (id: string, body: UpdateNoteInput) =>
    apiRequest<NoteDto>(`/notes/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => apiRequest<void>(`/notes/${id}`, { method: 'DELETE' }),
};
