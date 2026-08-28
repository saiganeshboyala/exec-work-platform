import type {
  BulkUpdateItemsInput,
  CreateItemInput,
  ItemDto,
  ListItemsQuery,
  UpdateItemInput,
} from '@ewp/contracts';
import type { Prisma } from '@prisma/client';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { toPrismaOrderBy, toPrismaPage } from '@/common/utils';
import { prisma } from '@/database';
import { itemFilter } from '@/modules/access';
import { activityService } from '@/modules/activity';
import { automationsService } from '@/modules/automations';
import { boardsService } from '@/modules/boards';
import { meetingsService } from '@/modules/meetings';
import { notificationsService } from '@/modules/notifications';

import { toItemDto } from './items.mapper';
import { itemsRepository } from './items.repository';

const SORTABLE_FIELDS = ['dueDate', 'createdAt', 'updatedAt', 'priority', 'title'] as const;

function buildWhere(
  organizationId: string,
  query: ListItemsQuery,
  scope: Prisma.ItemWhereInput,
): Prisma.ItemWhereInput {
  return {
    AND: [scope],
    deletedAt: null,
    board: {
      deletedAt: null,
      workspace: { organizationId, deletedAt: null },
      ...(query.boardId ? { id: query.boardId } : {}),
    },
    ...(query.status ? { status: query.status } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.dueBefore ? { dueDate: { lte: query.dueBefore } } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
  };
}

export const itemsService = {
  async list(auth: AuthContext, query: ListItemsQuery) {
    const { skip, take } = toPrismaPage(query);
    const orderBy = toPrismaOrderBy(query.sort, SORTABLE_FIELDS, { createdAt: 'desc' });

    const [rows, total] = await itemsRepository.findMany(
      buildWhere(auth.organizationId, query, await itemFilter(auth)),
      orderBy,
      skip,
      take,
    );

    let items = rows.map(toItemDto);
    // Health is derived, not stored, so it is filtered after mapping.
    if (query.health) items = items.filter((item) => item.health === query.health);

    return { items, total };
  },

  async getOrFail(auth: AuthContext, id: string) {
    const row = await itemsRepository.findById(auth.organizationId, id, await itemFilter(auth));
    if (!row) throw AppError.notFound('Item');
    return row;
  },

  async get(auth: AuthContext, id: string): Promise<ItemDto> {
    return toItemDto(await this.getOrFail(auth, id));
  },

  async create(auth: AuthContext, input: CreateItemInput, requestId: string): Promise<ItemDto> {
    await boardsService.getOrFail(auth, input.boardId);

    // assigneeIds is a join table, not a column on items.
    const { assigneeIds, ...columns } = input;

    const created = await itemsRepository.create({
      ...columns,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      ownerId: input.ownerId ?? null,
      parentId: input.parentId ?? null,
      // Kept so somebody who raises a task and assigns it elsewhere can still
      // find it. Restricted roles are filtered on exactly this.
      createdById: auth.userId,
    });

    const row =
      assigneeIds && assigneeIds.length > 0
        ? await this.setAssignees(auth, created.id, assigneeIds, [])
        : created;

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Item',
      entityId: row.id,
      verb: 'CREATED',
      after: { title: row.title, status: row.status },
      requestId,
    });

    return toItemDto(row);
  },

  /**
   * A status move to DONE stamps completedAt, and a move to BLOCKED requires a
   * reason - that reason is what surfaces in the executive decision queue.
   */
  async update(
    auth: AuthContext,
    id: string,
    input: UpdateItemInput,
    requestId: string,
  ): Promise<ItemDto> {
    const existing = await this.getOrFail(auth, id);

    if (input.status === 'BLOCKED' && !(input.blockedReason ?? existing.blockedReason)) {
      throw AppError.badRequest('Say what is blocking this before you set it to blocked', [
        { field: 'blockedReason', message: 'Describe the blocker' },
      ]);
    }

    // Moving departments: the target has to be one this person could have put
    // the task in themselves, or a move becomes a way to reach a hidden board.
    if (input.boardId && input.boardId !== existing.boardId) {
      await boardsService.getOrFail(auth, input.boardId);
    }

    const { assigneeIds, ...columns } = input;
    const data: Prisma.ItemUncheckedUpdateInput = { ...columns };
    if (input.status === 'DONE' && existing.status !== 'DONE') data.completedAt = new Date();
    if (input.status && input.status !== 'DONE') data.completedAt = null;
    if (input.status && input.status !== 'BLOCKED') data.blockedReason = null;

    let row = await itemsRepository.update(id, data);

    if (assigneeIds) {
      row = await this.setAssignees(
        auth,
        id,
        assigneeIds,
        existing.assignees.map((link) => link.userId),
      );
    }

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Item',
      entityId: id,
      verb: input.status && input.status !== existing.status ? 'STATUS_CHANGED' : 'UPDATED',
      before: { status: existing.status, ownerId: existing.ownerId, dueDate: existing.dueDate },
      after: { status: row.status, ownerId: row.ownerId, dueDate: row.dueDate },
      requestId,
    });

    if (input.status && input.status !== existing.status) {
      await automationsService.run(auth.organizationId, 'STATUS_CHANGED', row, {
        status: existing.status,
      });
    }
    if (input.ownerId !== undefined && row.ownerId !== existing.ownerId) {
      await automationsService.run(auth.organizationId, 'OWNER_CHANGED', row, {
        ownerId: existing.ownerId,
      });
    }

    // Being handed work is the one change worth interrupting somebody for.
    if (row.ownerId && row.ownerId !== existing.ownerId && row.ownerId !== auth.userId) {
      await notificationsService.notify({
        organizationId: auth.organizationId,
        userIds: [row.ownerId],
        title: 'Assigned to you',
        body: row.title,
        url: `/boards/${row.boardId}`,
      });
    }

    return toItemDto(row);
  },

  /**
   * Replaces the assignee set. Ids are filtered to real members of the tenant,
   * so a crafted request cannot attach an outsider to a task, and only people
   * who are genuinely new get told about it.
   */
  async setAssignees(
    auth: AuthContext,
    itemId: string,
    userIds: string[],
    previousIds: string[],
  ) {
    const wanted = [...new Set(userIds)];

    const members = await prisma.membership.findMany({
      where: { organizationId: auth.organizationId, userId: { in: wanted } },
      select: { userId: true },
    });
    const allowed = members.map((member) => member.userId);

    await prisma.$transaction([
      prisma.itemAssignee.deleteMany({ where: { itemId, userId: { notIn: allowed } } }),
      prisma.itemAssignee.createMany({
        data: allowed.map((userId) => ({ itemId, userId })),
        skipDuplicates: true,
      }),
    ]);

    const added = allowed.filter((userId) => !previousIds.includes(userId) && userId !== auth.userId);
    const row = await this.getOrFail(auth, itemId);

    if (added.length > 0) {
      await notificationsService.notify({
        organizationId: auth.organizationId,
        userIds: added,
        title: 'Added to a task',
        body: row.title,
        url: `/boards/${row.boardId}?item=${itemId}`,
      });
    }

    return row;
  },

  async remove(auth: AuthContext, id: string, requestId: string): Promise<void> {
    await this.getOrFail(auth, id);
    await itemsRepository.softDelete(id);

    // A meeting booked about this task has nothing left to discuss, so it goes
    // too. One that also covers other tasks does not: the task drops off its
    // agenda and the rest of the room still has a reason to meet.
    const agendas = await prisma.meetingAgendaItem.findMany({
      // Only meetings this task was actually put on. Being swept onto an agenda
      // for being overdue does not make the meeting about it.
      where: { itemId: id, chosen: true, meeting: { cancelledAt: null } },
      select: { meetingId: true, meeting: { select: { seriesId: true } } },
    });

    // A repeat is one row per occurrence here but one event in the calendar.
    // Cancelling them one at a time would email every attendee once per week.
    const doneSeries = new Set<string>();

    for (const { meetingId, meeting } of agendas) {
      const remaining = await prisma.meetingAgendaItem.count({
        where: { meetingId, chosen: true, itemId: { not: id }, item: { deletedAt: null } },
      });

      if (remaining > 0) {
        await prisma.meetingAgendaItem.deleteMany({ where: { meetingId, itemId: id } });
        continue;
      }

      if (meeting.seriesId) {
        if (doneSeries.has(meeting.seriesId)) continue;
        doneSeries.add(meeting.seriesId);
        await meetingsService.cancelSeries(auth, meetingId, requestId).catch(() => undefined);
      } else {
        await meetingsService.cancel(auth, meetingId, requestId).catch(() => undefined);
      }
    }

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Item',
      entityId: id,
      verb: 'DELETED',
      requestId,
    });
  },

  /**
   * Applies one patch to many items. Ids are re-scoped to the tenant first, so
   * a request naming somebody else's item silently affects nothing rather than
   * leaking that it exists.
   */
  async bulkUpdate(
    auth: AuthContext,
    itemIds: string[],
    patch: BulkUpdateItemsInput['patch'],
    requestId: string,
  ): Promise<{ updated: number }> {
    const owned = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        deletedAt: null,
        board: { deletedAt: null, workspace: { organizationId: auth.organizationId } },
      },
      select: { id: true, status: true, ownerId: true },
    });

    if (owned.length === 0) return { updated: 0 };

    if (patch.status === 'BLOCKED' && !patch.blockedReason) {
      throw AppError.badRequest('Say what is blocking these before setting them to blocked', [
        { field: 'blockedReason', message: 'Describe the blocker' },
      ]);
    }

    const data: Prisma.ItemUpdateManyMutationInput = { ...patch };
    if (patch.status === 'DONE') data.completedAt = new Date();
    if (patch.status && patch.status !== 'DONE') data.completedAt = null;
    if (patch.status && patch.status !== 'BLOCKED') data.blockedReason = null;

    const ids = owned.map((item) => item.id);
    const result = await prisma.item.updateMany({ where: { id: { in: ids } }, data });

    await Promise.all(
      owned.map((item) =>
        activityService.record({
          organizationId: auth.organizationId,
          actorId: auth.userId,
          entityType: 'Item',
          entityId: item.id,
          verb: patch.status && patch.status !== item.status ? 'STATUS_CHANGED' : 'UPDATED',
          before: { status: item.status, ownerId: item.ownerId },
          after: { ...patch },
          requestId,
        }),
      ),
    );

    // One notification per newly assigned person, not one per row.
    if (patch.ownerId && patch.ownerId !== auth.userId) {
      const newlyAssigned = owned.filter((item) => item.ownerId !== patch.ownerId);
      if (newlyAssigned.length > 0) {
        await notificationsService.notify({
          organizationId: auth.organizationId,
          userIds: [patch.ownerId],
          title: 'Assigned to you',
          body: `${newlyAssigned.length} task${newlyAssigned.length === 1 ? '' : 's'} were assigned to you`,
          url: '/boards',
        });
      }
    }

    return { updated: result.count };
  },

  async bulkRemove(
    auth: AuthContext,
    itemIds: string[],
    requestId: string,
  ): Promise<{ updated: number }> {
    const owned = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        deletedAt: null,
        board: { deletedAt: null, workspace: { organizationId: auth.organizationId } },
      },
      select: { id: true },
    });

    if (owned.length === 0) return { updated: 0 };

    const ids = owned.map((item) => item.id);
    const result = await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    await Promise.all(
      ids.map((id) =>
        activityService.record({
          organizationId: auth.organizationId,
          actorId: auth.userId,
          entityType: 'Item',
          entityId: id,
          verb: 'DELETED',
          requestId,
        }),
      ),
    );

    return { updated: result.count };
  },
};
