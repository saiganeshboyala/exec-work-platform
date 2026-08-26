import type { ActivityVerb, Prisma } from '@prisma/client';

import { prisma, type TransactionClient } from '@/database';

export interface RecordActivityInput {
  organizationId: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  verb: ActivityVerb;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  requestId?: string;
}

export const activityRepository = {
  /** Accepts a transaction client so the audit row commits with its change. */
  record(input: RecordActivityInput, tx: TransactionClient = prisma) {
    return tx.activity.create({ data: input });
  },

  listForEntity(organizationId: string, entityType: string, entityId: string, take = 50) {
    return prisma.activity.findMany({
      where: { organizationId, entityType, entityId },
      include: { actor: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  },

  listForOrganization(organizationId: string, skip: number, take: number) {
    return prisma.$transaction([
      prisma.activity.findMany({
        where: { organizationId },
        include: { actor: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activity.count({ where: { organizationId } }),
    ]);
  },
};
