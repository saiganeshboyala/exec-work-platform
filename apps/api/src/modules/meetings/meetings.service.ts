import type { MeetingDto, RecordDecisionInput, ScheduleMeetingInput } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import { logger } from '@/common/logger';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { calendarProvider } from '@/integrations/calendar';
import { meetingFilter } from '@/modules/access';
import { activityService } from '@/modules/activity';
import { notificationsService } from '@/modules/notifications';
import { workspacesService } from '@/modules/workspaces';

type MeetingRow = Awaited<ReturnType<typeof loadMeeting>>;

async function loadMeeting(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      attendees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      agenda: true,
      _count: { select: { decisions: true } },
    },
  });
}

function toDto(row: NonNullable<MeetingRow>): MeetingDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    location: row.location,
    calendarEventId: row.calendarEventId,
    joinUrl: row.joinUrl,
    attendees: row.attendees.map((a) => ({ id: a.user.id, fullName: a.user.fullName })),
    agendaItemIds: row.agenda.map((a) => a.itemId),
    decisionCount: row._count.decisions,
  };
}

export const meetingsService = {
  async listUpcoming(auth: AuthContext, take = 10) {
    const rows = await prisma.meeting.findMany({
      where: {
        cancelledAt: null,
        startsAt: { gte: new Date() },
        workspace: { organizationId: auth.organizationId, deletedAt: null },
        ...meetingFilter(auth),
      },
      include: {
        attendees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        agenda: true,
        _count: { select: { decisions: true } },
      },
      orderBy: { startsAt: 'asc' },
      take,
    });
    return rows.map(toDto);
  },

  /** The calendar view asks for a window rather than "the next ten". */
  async listInRange(auth: AuthContext, from: Date, to: Date, workspaceId?: string) {
    const rows = await prisma.meeting.findMany({
      where: {
        cancelledAt: null,
        startsAt: { gte: from, lte: to },
        workspace: {
          organizationId: auth.organizationId,
          deletedAt: null,
          ...(workspaceId ? { id: workspaceId } : {}),
        },
        ...meetingFilter(auth),
      },
      include: {
        attendees: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        agenda: true,
        _count: { select: { decisions: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(toDto);
  },

  /**
   * Meetings already in the diary that overlap the proposed window and share at
   * least one attendee. Two meetings overlap when each starts before the other
   * ends - touching back-to-back (10:00-10:30 then 10:30-11:00) is not a clash.
   */
  async findConflicts(
    auth: AuthContext,
    startsAt: Date,
    endsAt: Date,
    attendeeIds: string[],
    excludeMeetingId?: string,
  ) {
    if (attendeeIds.length === 0) return [];

    const rows = await prisma.meeting.findMany({
      where: {
        cancelledAt: null,
        ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        workspace: { organizationId: auth.organizationId, deletedAt: null },
        attendees: { some: { userId: { in: attendeeIds } } },
      },
      include: {
        attendees: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return rows.map((row) => ({
      meetingId: row.id,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      clashingAttendees: row.attendees
        .filter((attendee) => attendeeIds.includes(attendee.userId))
        .map((attendee) => ({ id: attendee.user.id, fullName: attendee.user.fullName })),
    }));
  },

  /**
   * Schedules the meeting, pulls every blocked or overdue item in the workspace
   * onto the agenda automatically, then mirrors it to the external calendar.
   * A calendar failure does not fail the request - the meeting still exists.
   */
  async schedule(auth: AuthContext, input: ScheduleMeetingInput, requestId: string): Promise<MeetingDto> {
    await workspacesService.getOrFail(auth, input.workspaceId);

    const attention = await prisma.item.findMany({
      where: {
        deletedAt: null,
        board: { deletedAt: null, workspaceId: input.workspaceId },
        OR: [{ status: 'BLOCKED' }, { dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'CANCELLED'] } }],
      },
      select: { id: true },
      take: 50,
    });

    const agendaItemIds = [...new Set([...input.itemIds, ...attention.map((i) => i.id)])];

    const meeting = await prisma.meeting.create({
      data: {
        workspaceId: input.workspaceId,
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        location: input.location,
        joinUrl: input.joinUrl ?? null,
        createdById: auth.userId,
        attendees: { createMany: { data: input.attendeeIds.map((userId) => ({ userId })) } },
        agenda: {
          createMany: { data: agendaItemIds.map((itemId, position) => ({ itemId, position })) },
        },
      },
      include: { attendees: { include: { user: { select: { id: true, email: true, fullName: true } } } } },
    });

    try {
      const event = await calendarProvider.createEvent({
        title: input.title,
        description: `${agendaItemIds.length} agenda items pulled from the board.`,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        location: input.location,
        attendeeEmails: meeting.attendees.map((a) => a.user.email),
        organizerUserId: auth.userId,
      });
      if (event.externalId || event.joinUrl) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            calendarEventId: event.externalId || null,
            // A provider-issued Meet link wins over anything typed by hand.
            ...(event.joinUrl ? { joinUrl: event.joinUrl } : {}),
          },
        });
      }
    } catch (error) {
      logger.error({ err: error, meetingId: meeting.id }, 'Calendar sync failed; meeting kept');
    }

    await notificationsService.notify({
      organizationId: auth.organizationId,
      userIds: input.attendeeIds.filter((id) => id !== auth.userId),
      title: 'New meeting',
      body: `${input.title} · ${input.startsAt.toLocaleString('en-GB')}`,
      url: '/meetings',
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Meeting',
      entityId: meeting.id,
      verb: 'SCHEDULED',
      after: { title: meeting.title, startsAt: meeting.startsAt, agendaSize: agendaItemIds.length },
      requestId,
    });

    const fresh = await loadMeeting(meeting.id);
    if (!fresh) throw AppError.internal();
    return toDto(fresh);
  },

  /**
   * Closes the loop: a decision taken in the room becomes a tracked item with
   * an owner and a date, so the next agenda opens with its status.
   */
  async recordDecision(
    auth: AuthContext,
    meetingId: string,
    input: RecordDecisionInput,
    requestId: string,
  ) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspace: { organizationId: auth.organizationId } },
    });
    if (!meeting) throw AppError.notFound('Meeting');

    if (input.createFollowUpItem && !input.boardId) {
      throw AppError.badRequest('Choose a board for the follow-up item', [
        { field: 'boardId', message: 'Pick a board' },
      ]);
    }

    return prisma.$transaction(async (tx) => {
      let followUpItemId: string | null = null;

      if (input.createFollowUpItem && input.boardId) {
        const item = await tx.item.create({
          data: {
            boardId: input.boardId,
            title: input.text.slice(0, 300),
            ownerId: input.ownerId,
            dueDate: input.dueDate ?? null,
            status: 'NOT_STARTED',
            priority: 'HIGH',
          },
        });
        followUpItemId = item.id;
      }

      const decision = await tx.decision.create({
        data: {
          meetingId,
          text: input.text,
          ownerId: input.ownerId,
          dueDate: input.dueDate ?? null,
          followUpItemId,
        },
      });

      await activityService.record(
        {
          organizationId: auth.organizationId,
          actorId: auth.userId,
          entityType: 'Decision',
          entityId: decision.id,
          verb: 'CREATED',
          after: { text: decision.text, followUpItemId },
          requestId,
        },
        tx,
      );

      return decision;
    });
  },
};
