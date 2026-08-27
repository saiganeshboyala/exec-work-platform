import { env } from '@/config';

import type { CalendarProvider } from './calendar.types';
import { GoogleCalendarProvider } from './google.provider';
import { NoopCalendarProvider } from './noop.provider';

function createCalendarProvider(): CalendarProvider {
  switch (env.CALENDAR_DRIVER) {
    case 'google':
      return new GoogleCalendarProvider();
    case 'microsoft':
    case 'none':
    default:
      return new NoopCalendarProvider();
  }
}

export const calendarProvider = createCalendarProvider();
export {
  buildAuthorizeUrl,
  completeOAuth,
  connectedEmail,
  disconnect,
  hasCalendarScope,
  isGoogleConfigured,
} from './google.provider';
export type { CalendarEvent, CalendarEventInput, CalendarProvider } from './calendar.types';
