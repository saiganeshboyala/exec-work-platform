import type { NotificationFeedDto, PushConfigDto, PushSubscribeInput } from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const notificationsApi = {
  feed: () => apiRequest<NotificationFeedDto>('/notifications'),
  markAllRead: () => apiRequest<void>('/notifications/read', { method: 'POST' }),
  pushConfig: () => apiRequest<PushConfigDto>('/notifications/push/config'),
  subscribe: (body: PushSubscribeInput) =>
    apiRequest<void>('/notifications/push/subscribe', { method: 'POST', body }),
  unsubscribe: (endpoint: string) =>
    apiRequest<void>('/notifications/push/unsubscribe', { method: 'POST', body: { endpoint } }),
};
