export interface CalendarEventInput {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  attendeeEmails: string[];
  /**
   * Whose calendar the event belongs to. Providers that act on behalf of a
   * person (Google, Microsoft) need this; the no-op provider ignores it.
   */
  organizerUserId?: string;
}

export interface CalendarEvent {
  externalId: string;
  joinUrl: string | null;
}

/** Google and Microsoft both sit behind this. `none` is a working no-op. */
export interface CalendarProvider {
  readonly name: string;
  createEvent(input: CalendarEventInput): Promise<CalendarEvent>;
  cancelEvent(externalId: string, organizerUserId?: string): Promise<void>;
}
