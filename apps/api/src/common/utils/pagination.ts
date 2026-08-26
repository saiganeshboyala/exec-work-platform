import type { PaginationQuery } from '@ewp/contracts';

export interface PrismaPage {
  skip: number;
  take: number;
}

export function toPrismaPage({ page, pageSize }: PaginationQuery): PrismaPage {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Turns `sort=dueDate:asc` into a Prisma orderBy, but only for fields the
 * caller explicitly allow-lists. Never pass user input straight to orderBy.
 */
export function toPrismaOrderBy<T extends string>(
  sort: string | undefined,
  allowed: readonly T[],
  fallback: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  if (!sort) return fallback;

  const [field, direction = 'asc'] = sort.split(':');
  if (!field || !allowed.includes(field as T)) return fallback;
  if (direction !== 'asc' && direction !== 'desc') return fallback;

  return { [field]: direction };
}
