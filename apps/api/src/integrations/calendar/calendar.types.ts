export interface CalendarEventInput {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  attendeeEmails: string[];
  /**
   * RFC 5545 rules. One event carrying these is a recurring meeting: attendees
   * are invited once for the whole series rather than once per occurrence.
   */
  recurrence?: string[];
  /** IANA zone the times are meant in. Required by Google for a recurring event. */
  timeZone?: string;
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
  /**
   * Replaces the guest list. The provider works out who is new and who has
   * gone, so newcomers receive an invitation and anyone dropped receives a
   * cancellation - which is the whole reason this is not done by hand.
   *
   * Attendees belong to the event, so on a recurring one this covers every
   * occurrence. There is no such thing as coming to only the third week.
   */
  updateAttendees(
    externalId: string,
    attendeeEmails: string[],
    organizerUserId?: string,
  ): Promise<void>;
  /**
   * One occurrence of a recurring event, addressed by the time it was
   * originally due to start. Cancelling or moving a single week must not
   * disturb the rest of the series - or re-invite anyone to it.
   */
  cancelInstance(
    externalId: string,
    originalStartsAt: Date,
    organizerUserId?: string,
  ): Promise<void>;
  updateInstance(
    externalId: string,
    originalStartsAt: Date,
    input: Pick<CalendarEventInput, 'title' | 'startsAt' | 'endsAt'>,
    organizerUserId?: string,
  ): Promise<void>;
}
