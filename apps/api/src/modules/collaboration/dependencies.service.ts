import type { CreateDependencyInput, DependencyDto } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { itemsService } from '@/modules/items';

export const dependenciesService = {
  /** Both directions for one item: what blocks it, and what it blocks. */
  async listFor(auth: AuthContext, itemId: string): Promise<DependencyDto[]> {
    await itemsService.getOrFail(auth, itemId);

    const [blockedBy, blocking] = await Promise.all([
      prisma.itemDependency.findMany({
        where: { blockedItemId: itemId },
        include: { blockingItem: { select: { title: true, status: true } } },
      }),
      prisma.itemDependency.findMany({
        where: { blockingItemId: itemId },
        include: { blockedItem: { select: { title: true, status: true } } },
      }),
    ]);

    return [
      ...blockedBy.map((row) => ({
        id: row.id,
        blockedItemId: row.blockedItemId,
        blockingItemId: row.blockingItemId,
        otherTitle: row.blockingItem.title,
        otherStatus: row.blockingItem.status,
      })),
      ...blocking.map((row) => ({
        id: row.id,
        blockedItemId: row.blockedItemId,
        blockingItemId: row.blockingItemId,
        otherTitle: row.blockedItem.title,
        otherStatus: row.blockedItem.status,
      })),
    ];
  },

  async create(auth: AuthContext, input: CreateDependencyInput): Promise<DependencyDto> {
    if (input.blockedItemId === input.blockingItemId) {
      throw AppError.badRequest('An item cannot block itself');
    }

    // Both ends must be inside the caller's tenant.
    const [blocked, blocking] = await Promise.all([
      itemsService.getOrFail(auth, input.blockedItemId),
      itemsService.getOrFail(auth, input.blockingItemId),
    ]);

    if (await createsCycle(input.blockingItemId, input.blockedItemId)) {
      throw AppError.badRequest('That would create a circular dependency');
    }

    const row = await prisma.itemDependency.upsert({
      where: {
        blockedItemId_blockingItemId: {
          blockedItemId: input.blockedItemId,
          blockingItemId: input.blockingItemId,
        },
      },
      create: {
        organizationId: auth.organizationId,
        blockedItemId: input.blockedItemId,
        blockingItemId: input.blockingItemId,
      },
      update: {},
    });

    return {
      id: row.id,
      blockedItemId: blocked.id,
      blockingItemId: blocking.id,
      otherTitle: blocking.title,
      otherStatus: blocking.status,
    };
  },

  async remove(auth: AuthContext, id: string): Promise<void> {
    const row = await prisma.itemDependency.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!row) throw AppError.notFound('Dependency');
    await prisma.itemDependency.delete({ where: { id } });
  },
};

/**
 * Walks the blocking graph from `start`. If it can reach `target`, adding
 * target -> start would close a loop and no item in it could ever start.
 */
async function createsCycle(start: string, target: string): Promise<boolean> {
  const seen = new Set<string>();
  let frontier = [start];

  while (frontier.length > 0) {
    if (frontier.includes(target)) return true;
    for (const id of frontier) seen.add(id);

    const edges = await prisma.itemDependency.findMany({
      where: { blockedItemId: { in: frontier } },
      select: { blockingItemId: true },
    });

    frontier = edges.map((edge) => edge.blockingItemId).filter((id) => !seen.has(id));
  }

  return false;
}
