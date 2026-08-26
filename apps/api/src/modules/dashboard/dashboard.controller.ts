import type { DashboardQuery } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async executive(req: Request, res: Response): Promise<void> {
    const dto = await dashboardService.build(requireAuth(req), req.query as unknown as DashboardQuery);
    // Short cache: Todo is read constantly and never needs to be to-the-second.
    res.setHeader('Cache-Control', 'private, max-age=30');
    sendOk(res, dto);
  },
};
