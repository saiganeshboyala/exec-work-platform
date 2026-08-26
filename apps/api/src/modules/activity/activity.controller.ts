import type { PaginationQuery } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { buildPageMeta, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { activityService } from './activity.service';

export const activityController = {
  async list(req: Request, res: Response): Promise<void> {
    const { organizationId } = requireAuth(req);
    const query = req.query as unknown as PaginationQuery;

    const { rows, total } = await activityService.forOrganization(organizationId, query);
    sendOk(res, rows, 200, buildPageMeta(query.page, query.pageSize, total));
  },

  async listForEntity(req: Request, res: Response): Promise<void> {
    const { organizationId } = requireAuth(req);
    const { entityType, entityId } = req.params as { entityType: string; entityId: string };

    sendOk(res, await activityService.forEntity(organizationId, entityType, entityId));
  },
};
