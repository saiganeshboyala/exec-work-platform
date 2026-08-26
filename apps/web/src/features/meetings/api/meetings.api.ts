import type {
  CalendarConnectionDto,
  MeetingConflictDto,
  MeetingDto,
  ScheduleMeetingInput,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

export const meetingsApi = {
  listInRange: (from: Date, to: Date, workspaceId?: string) =>
    apiRequest<MeetingDto[]>('/meetings', {
      query: { from: from.toISOString(), to: to.toISOString(), workspaceId },
    }),

  conflicts: (startsAt: Date, endsAt: Date, attendeeIds: string[], excludeMeetingId?: string) =>
    apiRequest<MeetingConflictDto[]>('/meetings/conflicts', {
      query: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        attendeeIds: attendeeIds.join(','),
        excludeMeetingId,
      },
    }),

  schedule: (body: ScheduleMeetingInput) =>
    apiRequest<MeetingDto>('/meetings', { method: 'POST', body }),

  calendarStatus: () => apiRequest<CalendarConnectionDto>('/integrations/google/status'),

  authorizeUrl: () => apiRequest<{ url: string }>('/integrations/google/authorize'),

  disconnectCalendar: () => apiRequest<void>('/integrations/google', { method: 'DELETE' }),
};
