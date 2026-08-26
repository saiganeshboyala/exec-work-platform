import type { Prisma } from '@prisma/client';

import { prisma } from '@/database';

export const itemInclude = {
  board: { select: { name: true } },
  owner: { select: { id: true, fullName: true, avatarUrl: true } },
  assignees: {
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    orderBy: { assignedAt: 'asc' },
  },
  // Agenda links carry the meeting a task is scheduled to be discussed at.
  agendaFor: {
    include: { meeting: { select: { id: true, title: true, startsAt: true, cancelledAt: true } } },
  },
  _count: { select: { subitems: true } },
} satisfies Prisma.ItemInclude;

export type ItemRow = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

export const itemsRepository = {
  findMany(where: Prisma.ItemWhereInput, orderBy: Prisma.ItemOrderByWithRelationInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.item.findMany({ where, include: itemInclude, orderBy, skip, take }),
      prisma.item.count({ where }),
    ]);
  },

  findById(organizationId: string, id: string, scope: Prisma.ItemWhereInput = {}) {
    return prisma.item.findFirst({
      where: {
        id,
        deletedAt: null,
        board: { deletedAt: null, workspace: { organizationId, deletedAt: null } },
        AND: [scope],
      },
      include: itemInclude,
    });
  },

  create(data: Prisma.ItemUncheckedCreateInput) {
    return prisma.item.create({ data, include: itemInclude });
  },

  update(id: string, data: Prisma.ItemUncheckedUpdateInput) {
    return prisma.item.update({ where: { id }, data, include: itemInclude });
  },

  softDelete(id: string) {
    return prisma.item.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
