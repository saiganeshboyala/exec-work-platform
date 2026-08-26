import type { UpdateProfileInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { usersService } from './users.service';

export const usersController = {
  async getById(req: Request, res: Response): Promise<void> {
    const { organizationId } = requireAuth(req);
    sendOk(res, await usersService.getById(organizationId, req.params.id as string));
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    sendOk(res, await usersService.updateProfile(userId, req.body as UpdateProfileInput));
  },
};
