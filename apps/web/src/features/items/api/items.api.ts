import type { CreateItemInput, ItemDto, UpdateItemInput } from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const itemsApi = {
  /**
   * The board renders every task at once rather than paging: a board that has
   * outgrown 100 rows wants a filter, not a second page.
   */
  listForBoard: (boardId: string) =>
    apiRequest<ItemDto[]>('/items', { query: { boardId, pageSize: 100 } }),

  /** Every task the caller may see, across departments. Scoped server-side. */
  listAll: () => apiRequest<ItemDto[]>('/items', { query: { pageSize: 100 } }),

  create: (body: CreateItemInput) => apiRequest<ItemDto>('/items', { method: 'POST', body }),

  update: (id: string, body: UpdateItemInput) =>
    apiRequest<ItemDto>(`/items/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => apiRequest<void>(`/items/${id}`, { method: 'DELETE' }),
};
