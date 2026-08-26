import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';

import { dashboardApi } from '../api/dashboard.api';

export function useExecutiveDashboard(workspaceId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(workspaceId),
    queryFn: () => dashboardApi.executive(workspaceId),
    // Todo is left open on a screen all day; keep it fresh without churn.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
