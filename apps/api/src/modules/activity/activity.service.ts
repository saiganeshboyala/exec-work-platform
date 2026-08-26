import type { PaginationQuery } from '@ewp/contracts';

import { toPrismaPage } from '@/common/utils';

import { activityRepository, type RecordActivityInput } from './activity.repository';

/**
 * The audit trail. Two rules, both non-negotiable:
 *   1. Nothing that changes tenant data may skip this.
 *   2. Rows are append-only. There is no update or delete method, by design.
 */
export const activityService = {
  record: activityRepository.record,

  forEntity(organizationId: string, entityType: string, entityId: string) {
    return activityRepository.listForEntity(organizationId, entityType, entityId);
  },

  async forOrganization(organizationId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaPage(query);
    const [rows, total] = await activityRepository.listForOrganization(organizationId, skip, take);
    return { rows, total };
  },
};

export type { RecordActivityInput };
