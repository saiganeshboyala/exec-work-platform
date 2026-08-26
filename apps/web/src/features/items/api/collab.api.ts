import type {
  ActivityDto,
  BulkResultDto,
  BulkUpdateItemsInput,
  CommentDto,
  CreateCommentInput,
  CreateDependencyInput,
  DependencyDto,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const collabApi = {
  listComments: (itemId: string) =>
    apiRequest<CommentDto[]>('/collab/comments', { query: { itemId } }),
  addComment: (body: CreateCommentInput) =>
    apiRequest<CommentDto>('/collab/comments', { method: 'POST', body }),
  deleteComment: (id: string) =>
    apiRequest<void>(`/collab/comments/${id}`, { method: 'DELETE' }),

  listDependencies: (itemId: string) =>
    apiRequest<DependencyDto[]>('/collab/dependencies', { query: { itemId } }),
  addDependency: (body: CreateDependencyInput) =>
    apiRequest<DependencyDto>('/collab/dependencies', { method: 'POST', body }),
  removeDependency: (id: string) =>
    apiRequest<void>(`/collab/dependencies/${id}`, { method: 'DELETE' }),

  bulkUpdate: (body: BulkUpdateItemsInput) =>
    apiRequest<BulkResultDto>('/collab/items/bulk-update', { method: 'POST', body }),
  bulkDelete: (itemIds: string[]) =>
    apiRequest<BulkResultDto>('/collab/items/bulk-delete', { method: 'POST', body: { itemIds } }),

  activityFor: (entityId: string) =>
    apiRequest<ActivityDto[]>('/admin/audit', { query: { entityId, take: 30 } }),
};
