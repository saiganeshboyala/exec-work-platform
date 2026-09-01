import type {
  BoardDto,
  CreateBoardInput,
  CreateWorkspaceInput,
  WorkspaceDto,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const boardsApi = {
  listWorkspaces: () => apiRequest<WorkspaceDto[]>('/workspaces'),
  createWorkspace: (body: CreateWorkspaceInput) =>
    apiRequest<WorkspaceDto>('/workspaces', { method: 'POST', body }),

  list: (workspaceId: string) => apiRequest<BoardDto[]>('/boards', { query: { workspaceId } }),

  /** Every department the caller can see, across workspaces. */
  listAll: () => apiRequest<BoardDto[]>('/boards'),
  get: (id: string) => apiRequest<BoardDto>(`/boards/${id}`),
  create: (body: CreateBoardInput) => apiRequest<BoardDto>('/boards', { method: 'POST', body }),
  remove: (id: string) => apiRequest<void>(`/boards/${id}`, { method: 'DELETE' }),

  /** Takes the departments and the meetings booked in it with it. */
  removeWorkspace: (id: string) => apiRequest<void>(`/workspaces/${id}`, { method: 'DELETE' }),
};
