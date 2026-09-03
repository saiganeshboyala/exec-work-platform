import type { ExecutiveDashboardDto } from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const dashboardApi = {
  executive: (workspaceId?: string) =>
    apiRequest<ExecutiveDashboardDto>('/dashboard/executive', { query: { workspaceId } }),
};

