import type { Prisma } from '@prisma/client';

import { prisma } from '@/database';

export const workspacesRepository = {
  listForOrganization(organizationId: string, scope: Prisma.WorkspaceWhereInput = {}) {
    return prisma.workspace.findMany({
      where: { organizationId, deletedAt: null, AND: [scope] },
      include: { _count: { select: { boards: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  findById(organizationId: string, id: string, scope: Prisma.WorkspaceWhereInput = {}) {
    return prisma.workspace.findFirst({
      // AND, never spread - see the note in boards.repository.
      where: { id, organizationId, deletedAt: null, AND: [scope] },
      include: { _count: { select: { boards: true } } },
    });
  },

  create(data: { organizationId: string; name: string; description?: string }) {
    return prisma.workspace.create({
      data,
      include: { _count: { select: { boards: true } } },
    });
  },

  update(id: string, data: { name?: string; description?: string }) {
    return prisma.workspace.update({
      where: { id },
      data,
      include: { _count: { select: { boards: true } } },
    });
  },

  softDelete(id: string) {
    return prisma.workspace.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  countMembers(organizationId: string) {
    return prisma.membership.count({ where: { organizationId } });
  },
};
