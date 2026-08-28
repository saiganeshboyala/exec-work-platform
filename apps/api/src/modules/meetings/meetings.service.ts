import { randomUUID } from 'node:crypto';

import { ROLE_RANK } from '@ewp/contracts';
import type {
  MeetingDto,
  RecordDecisionInput,
  RescheduleMeetingInput,
  ScheduleMeetingInput,
} from '@ewp/contracts';

import { AppError } from '@/common/errors';
import { logger } from '@/common/logger';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { calendarProvider } from '@/integrations/calendar';
import { meetingFilter } from '@/modules/access';
import { activityService } from '@/modules/activity';
import { boardsService } from '@/modules/boards';
import { notificationsService } from '@/modules/notifications';
import { workspacesService } from '@/modules/workspaces';

import { endFor, occurrenceStarts, toRRule } from './recurrence';

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
    seriesId: row.seriesId,
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
  async listInRange(
    auth: AuthContext,
    from: Date,
    to: Date,
    workspaceId?: string,
    itemId?: string,
  ) {
    const rows = await prisma.meeting.findMany({
      where: {
        cancelledAt: null,
        startsAt: { gte: from, lte: to },
        ...(itemId ? { agenda: { some: { itemId } } } : {}),
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

    // A meeting scheduled from scratch leaves nothing on a board to track it,
    // so one task is created to carry the preparation and the outcome.
    let createdTaskId: string | null = null;

    if (input.createTaskOnBoardId) {
      await boardsService.getOrFail(auth, input.createTaskOnBoardId);

      const task = await prisma.item.create({
        data: {
          boardId: input.createTaskOnBoardId,
          title: input.title.slice(0, 300),
          description: `Created automatically for the meeting on ${input.startsAt.toLocaleString('en-GB')}.`,
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          ownerId: auth.userId,
          dueDate: input.startsAt,
        },
      });
      createdTaskId = task.id;
    }

    // What the organiser asked for, as opposed to what was swept in for being
    // blocked or overdue. Only the first kind makes a meeting "about" a task.
    const chosenIds = new Set([...(createdTaskId ? [createdTaskId] : []), ...input.itemIds]);

    const agendaItemIds = [...new Set([...chosenIds, ...attention.map((i) => i.id)])];

    // One id shared by the whole series, so all of it can be called off at once.
    const seriesId = input.repeat ? randomUUID() : null;

    const meeting = await prisma.meeting.create({
      data: {
        workspaceId: input.workspaceId,
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        location: input.location,
        joinUrl: input.joinUrl ?? null,
        createdById: auth.userId,
        seriesId,
        attendees: { createMany: { data: input.attendeeIds.map((userId) => ({ userId })) } },
        agenda: {
          createMany: {
            data: agendaItemIds.map((itemId, position) => ({
              itemId,
              position,
              chosen: chosenIds.has(itemId),
            })),
          },
        },
      },
      include: { attendees: { include: { user: { select: { id: true, email: true, fullName: true } } } } },
    });

    let calendarWarning: string | undefined;

    // The user typed their own link, so nobody is waiting on Google for one.
    const wantsGeneratedLink = !input.joinUrl;

    if (wantsGeneratedLink && calendarProvider.name === 'none') {
      calendarWarning =
        'No calendar is connected on this server, so no Meet link was created. Paste a join link on the meeting, or set CALENDAR_DRIVER=google on the API.';
    }

    try {
      const event = await calendarProvider.createEvent({
        title: input.title,
        description: `${agendaItemIds.length} agenda items pulled from the board.`,
        // The rule covers the whole series, so attendees are invited once for
        // all of it rather than once per occurrence.
        ...(input.repeat ? { recurrence: [toRRule(input.repeat)] } : {}),
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
      // Handed back to the caller below. Keeping the meeting is right, but
      // saying nothing leaves people staring at a meeting with no link.
      calendarWarning = error instanceof Error ? error.message : 'Calendar sync failed';
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

    // The repeats. Rows of their own so a single week can be moved or called
    // off, but all pointing at the one recurring event created above - creating
    // an event each would invite everybody once per occurrence.
    if (input.repeat) {
      const [, ...laterStarts] = occurrenceStarts(input.startsAt, input.repeat);
      const seriesEventId = (await loadMeeting(meeting.id))?.calendarEventId ?? null;

      for (const startsAt of laterStarts) {
        await prisma.meeting.create({
          data: {
            workspaceId: input.workspaceId,
            title: input.title,
            startsAt,
            endsAt: endFor(startsAt, input.startsAt, input.endsAt),
            location: input.location,
            joinUrl: meeting.joinUrl ?? input.joinUrl ?? null,
            createdById: auth.userId,
            seriesId,
            calendarEventId: seriesEventId,
            attendees: { createMany: { data: input.attendeeIds.map((userId) => ({ userId })) } },
            agenda: {
              createMany: {
                data: agendaItemIds.map((itemId, position) => ({
                  itemId,
                  position,
                  chosen: chosenIds.has(itemId),
                })),
              },
            },
          },
        });
      }
    }

    const fresh = await loadMeeting(meeting.id);
    if (!fresh) throw AppError.internal();

    const dto = toDto(fresh);
    // A link that arrived by another route means there is nothing to warn about.
    return dto.joinUrl === null && calendarWarning ? { ...dto, calendarWarning } : dto;
  },

  /**
   * Closes the loop: a decision taken in the room becomes a tracked item with
   * an owner and a date, so the next agenda opens with its status.
   */
  /**
   * Moves a meeting without disturbing who is coming or what is on the agenda.
   * The calendar event is patched rather than replaced, so the join link people
   * already hold keeps working.
   */
  async reschedule(
    auth: AuthContext,
    meetingId: string,
    input: RescheduleMeetingInput,
    requestId: string,
  ): Promise<MeetingDto> {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        workspace: { organizationId: auth.organizationId, deletedAt: null },
      },
      include: { attendees: { select: { userId: true } } },
    });
    if (!meeting) throw AppError.notFound('Meeting');
    if (meeting.cancelledAt !== null) {
      throw AppError.badRequest('That meeting was cancelled. Schedule a new one instead.');
    }

    // Same bar as cancelling: the organiser, or a manager over them.
    if (meeting.createdById !== auth.userId && ROLE_RANK[auth.role] < ROLE_RANK.MANAGER) {
      throw AppError.forbidden('Only the organiser or a manager can move this meeting');
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        ...(input.title ? { title: input.title } : {}),
      },
    });

    let calendarWarning: string | undefined;

    if (meeting.calendarEventId) {
      try {
        const moved = {
          title: input.title ?? meeting.title,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        };

        if (meeting.seriesId) {
          // Moving the shared event would move every occurrence with it.
          await calendarProvider.updateInstance(
            meeting.calendarEventId,
            meeting.startsAt,
            moved,
            meeting.createdById,
          );
        } else {
          await calendarProvider.updateEvent(meeting.calendarEventId, moved, meeting.createdById);
        }
      } catch (error) {
        logger.error({ err: error, meetingId }, 'Calendar move failed; meeting moved here');
        // The meeting has already moved, so this is a warning rather than a
        // failure - but the calendar now disagrees and somebody must know.
        calendarWarning =
          (error instanceof Error ? error.message : 'The calendar could not be updated') +
          ' The meeting moved here, but the calendar invite still shows the old time.';
      }
    }

    await notificationsService.notify({
      organizationId: auth.organizationId,
      userIds: meeting.attendees.map((a) => a.userId).filter((id) => id !== auth.userId),
      title: 'Meeting moved',
      body: `${input.title ?? meeting.title} · ${input.startsAt.toLocaleString('en-GB')}`,
      url: '/meetings',
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Meeting',
      entityId: meetingId,
      verb: 'UPDATED',
      before: { startsAt: meeting.startsAt, endsAt: meeting.endsAt },
      after: { startsAt: input.startsAt, endsAt: input.endsAt },
      requestId,
    });

    const fresh = await loadMeeting(meetingId);
    if (!fresh) throw AppError.internal();

    const dto = toDto(fresh);
    return calendarWarning ? { ...dto, calendarWarning } : dto;
  },

  /**
   * Calls off every remaining occurrence of a repeating meeting. Past ones are
   * left alone - they happened, and cancelling history helps nobody.
   */
  async cancelSeries(auth: AuthContext, meetingId: string, requestId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        workspace: { organizationId: auth.organizationId, deletedAt: null },
      },
      include: { attendees: { select: { userId: true } } },
    });
    if (!meeting) throw AppError.notFound('Meeting');

    // A one-off has no siblings; cancelling "the series" is cancelling it.
    if (!meeting.seriesId) {
      await this.cancel(auth, meetingId, requestId);
      return { cancelled: 1 };
    }

    if (meeting.createdById !== auth.userId && ROLE_RANK[auth.role] < ROLE_RANK.MANAGER) {
      throw AppError.forbidden('Only the organiser or a manager can cancel this meeting');
    }

    const siblings = await prisma.meeting.findMany({
      where: {
        seriesId: meeting.seriesId,
        cancelledAt: null,
        startsAt: { gte: new Date() },
        workspace: { organizationId: auth.organizationId, deletedAt: null },
      },
      select: { id: true },
    });

    await prisma.meeting.updateMany({
      where: { id: { in: siblings.map((sibling) => sibling.id) } },
      data: { cancelledAt: new Date() },
    });

    // One delete, not one per occurrence: the whole series is a single event in
    // the calendar, so everybody is told once rather than a dozen times.
    if (meeting.calendarEventId) {
      try {
        await calendarProvider.cancelEvent(meeting.calendarEventId, meeting.createdById);
      } catch (error) {
        logger.error({ err: error, meetingId }, 'Calendar cancellation failed; series cancelled');
      }
    }

    await notificationsService.notify({
      organizationId: auth.organizationId,
      userIds: meeting.attendees.map((a) => a.userId).filter((id) => id !== auth.userId),
      title: 'Meetings cancelled',
      body: `${meeting.title} · ${siblings.length} remaining meetings`,
      url: '/meetings',
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Meeting',
      entityId: meetingId,
      verb: 'DELETED',
      before: { title: meeting.title, cancelled: siblings.length, series: true },
      requestId,
    });

    return { cancelled: siblings.length };
  },

  /**
   * Cancels a meeting rather than deleting it: the decisions taken in it and
   * the agenda it pulled together are still worth keeping, and every query
   * already filters on cancelledAt.
   */
  async cancel(auth: AuthContext, meetingId: string, requestId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        workspace: { organizationId: auth.organizationId, deletedAt: null },
      },
      include: { attendees: { select: { userId: true } } },
    });
    if (!meeting) throw AppError.notFound('Meeting');

    // Organisers can call off their own meeting; past that it takes a manager,
    // so one attendee cannot cancel something the rest of the room needs.
    const isOrganiser = meeting.createdById === auth.userId;
    if (!isOrganiser && ROLE_RANK[auth.role] < ROLE_RANK.MANAGER) {
      throw AppError.forbidden('Only the organiser or a manager can cancel this meeting');
    }

    if (meeting.cancelledAt !== null) return { alreadyCancelled: true };

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { cancelledAt: new Date() },
    });

    // Best effort: the meeting is already cancelled here, and failing to reach
    // Google should not undo that.
    if (meeting.calendarEventId) {
      try {
        if (meeting.seriesId) {
          // Every occurrence shares one recurring event, so deleting it would
          // call off the entire series. Only this instance is cancelled.
          await calendarProvider.cancelInstance(
            meeting.calendarEventId,
            meeting.startsAt,
            meeting.createdById,
          );
        } else {
          await calendarProvider.cancelEvent(meeting.calendarEventId, meeting.createdById);
        }
      } catch (error) {
        logger.error({ err: error, meetingId }, 'Calendar cancellation failed; meeting cancelled');
      }
    }

    await notificationsService.notify({
      organizationId: auth.organizationId,
      userIds: meeting.attendees.map((a) => a.userId).filter((id) => id !== auth.userId),
      title: 'Meeting cancelled',
      body: `${meeting.title} · ${meeting.startsAt.toLocaleString('en-GB')}`,
      url: '/meetings',
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Meeting',
      entityId: meetingId,
      // No CANCELLED verb in the enum, and adding one means a migration for
      // something DELETED already conveys.
      verb: 'DELETED',
      before: { title: meeting.title, startsAt: meeting.startsAt, cancelled: true },
      requestId,
    });

    return { alreadyCancelled: false };
  },

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
