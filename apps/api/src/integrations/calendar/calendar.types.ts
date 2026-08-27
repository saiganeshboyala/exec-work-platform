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
  /**
   * Moves an existing event. A patch rather than a delete-and-recreate so the
   * conferencing link people already hold keeps working.
   */
  updateEvent(
    externalId: string,
    input: Pick<CalendarEventInput, 'title' | 'startsAt' | 'endsAt'>,
    organizerUserId?: string,
  ): Promise<void>;
  cancelEvent(externalId: string, organizerUserId?: string): Promise<void>;
}
