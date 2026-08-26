import type { CalendarEvent, CalendarEventInput, CalendarProvider } from './calendar.types';

/**
 * Used when no calendar is connected. Meetings still exist in our database;
 * they are simply not mirrored to an external calendar.
 */
export class NoopCalendarProvider implements CalendarProvider {
  readonly name = 'none';

  async createEvent(_input: CalendarEventInput): Promise<CalendarEvent> {
    return { externalId: '', joinUrl: null };
  }

  async cancelEvent(_externalId: string, _organizerUserId?: string): Promise<void> {
    /* nothing to cancel */
  }
}
