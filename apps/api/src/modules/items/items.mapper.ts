import type { ItemDto } from '@ewp/contracts';

import { deriveHealth } from '@/common/utils';

import type { ItemRow } from './items.repository';

/**
 * The only place a database row becomes an API shape. Keeping mapping out of
 * the service means the wire format can change without touching business logic.
 */
export function toItemDto(row: ItemRow): ItemDto {
  // The soonest meeting still ahead of us; cancelled ones do not count.
  const upcoming = row.agendaFor
    .map((link) => link.meeting)
    .filter((meeting) => meeting.cancelledAt === null && meeting.startsAt >= new Date())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  return {
    id: row.id,
    boardId: row.boardId,
    title: row.title,
    description: row.description,
    status: row.status,
    health: deriveHealth(row.status, row.dueDate),
    priority: row.priority,
    owner: row.owner
      ? { id: row.owner.id, fullName: row.owner.fullName, avatarUrl: row.owner.avatarUrl }
      : null,
    assignees: row.assignees.map((link) => ({
      id: link.user.id,
      fullName: link.user.fullName,
      avatarUrl: link.user.avatarUrl,
    })),
    startDate: row.startDate?.toISOString() ?? null,
    dueDate: row.dueDate?.toISOString() ?? null,
    blockedReason: row.blockedReason,
    nextMeeting: upcoming
      ? { id: upcoming.id, title: upcoming.title, startsAt: upcoming.startsAt.toISOString() }
      : null,
    parentId: row.parentId,
    subitemCount: row._count.subitems,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
