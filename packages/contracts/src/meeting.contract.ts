import { z } from 'zod';

export const scheduleMeetingSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z.string().min(2).max(200).trim(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    attendeeIds: z.array(z.string().uuid()).min(1).max(50),
    /** Items pulled onto the agenda. Blocked and overdue items are added automatically. */
    itemIds: z.array(z.string().uuid()).max(100).default([]),
    location: z.string().max(300).trim().optional(),
    /**
     * A conferencing link supplied by the organiser. Ignored when Google
     * Calendar is connected, because Google issues its own Meet link.
     */
    joinUrl: z.string().url().max(1000).optional(),
    /**
     * When set, a task for this meeting is created on that board and put on the
     * agenda. Omitted when the meeting was raised from an existing task, which
     * already has one.
     */
    createTaskOnBoardId: z.string().uuid().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: 'The end time must be after the start time',
    path: ['endsAt'],
  });
export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;

/** Moving a meeting. The attendees and agenda stay as they are. */
export const rescheduleMeetingSchema = z
  .object({
    title: z.string().min(2).max(200).trim().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: 'The end time must be after the start time',
    path: ['endsAt'],
  });
export type RescheduleMeetingInput = z.infer<typeof rescheduleMeetingSchema>;

/** The calendar asks for a window; the list endpoint asks for nothing. */
export const listMeetingsQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    workspaceId: z.string().uuid().optional(),
  })
  .refine((v) => v.to > v.from, {
    message: 'The end of the range must be after the start',
    path: ['to'],
  });
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>;

/** Asks "is anyone busy in this window?" before a meeting is created. */
export const meetingConflictQuerySchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    attendeeIds: z
      .union([z.string(), z.array(z.string().uuid())])
      .transform((value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
      .pipe(z.array(z.string().uuid()).max(50)),
    /** Set when re-timing an existing meeting, so it does not clash with itself. */
    excludeMeetingId: z.string().uuid().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: 'The end time must be after the start time',
    path: ['endsAt'],
  });
export type MeetingConflictQuery = z.infer<typeof meetingConflictQuerySchema>;

export interface MeetingConflictDto {
  meetingId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  /** Only the people who are double-booked, not the whole invite list. */
  clashingAttendees: Array<{ id: string; fullName: string }>;
}

export const recordDecisionSchema = z.object({
  text: z.string().min(3).max(2000).trim(),
  ownerId: z.string().uuid(),
  dueDate: z.coerce.date().nullable().optional(),
  /** When true the decision is also written back to the board as a tracked item. */
  createFollowUpItem: z.boolean().default(true),
  boardId: z.string().uuid().optional(),
});
export type RecordDecisionInput = z.infer<typeof recordDecisionSchema>;

export interface MeetingDto {
  id: string;
  workspaceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  calendarEventId: string | null;
  joinUrl: string | null;
  attendees: Array<{ id: string; fullName: string }>;
  agendaItemIds: string[];
  decisionCount: number;
  /**
   * Why this meeting has no join link, when the calendar was meant to make one.
   * Only set on the response that created the meeting - a sync failure does not
   * fail the request, so without this the meeting arrives silently linkless.
   */
  calendarWarning?: string;
}

/** What the UI needs to decide between "Connect Google" and "Connected". */
export interface CalendarConnectionDto {
  provider: 'google' | 'microsoft' | 'none';
  connected: boolean;
  /** Null when the driver is configured but this user has not granted access. */
  connectedEmail: string | null;
  /** False when the server has no client credentials, so connecting is pointless. */
  configured: boolean;
  /**
   * False when connected but Google withheld calendar access - the connection
   * looks fine and cannot create a single event. Null when not connected.
   */
  canWriteEvents: boolean | null;
}
