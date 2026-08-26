import type { LoginInput, RefreshInput, RegisterInput, SignUpInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { authService } from './auth.service';

function meta(req: Request) {
  return { userAgent: req.header('user-agent'), ipAddress: req.ip, requestId: req.requestId };
}

export const authController = {
  async signUp(req: Request, res: Response): Promise<void> {
    sendOk(res, await authService.signUp(req.body as SignUpInput, req.requestId));
  },

  async register(req: Request, res: Response): Promise<void> {
    sendCreated(res, await authService.register(req.body as RegisterInput, meta(req)));
  },

  async login(req: Request, res: Response): Promise<void> {
    sendOk(res, await authService.login(req.body as LoginInput, meta(req)));
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshInput;
    sendOk(res, await authService.refresh(refreshToken, meta(req)));
  },

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshInput;
    await authService.logout(refreshToken);
    sendNoContent(res);
  },

  async me(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    sendOk(res, await authService.currentUser(userId));
  },
};
