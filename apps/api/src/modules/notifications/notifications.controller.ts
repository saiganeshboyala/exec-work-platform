import type { PushSubscribeInput, PushUnsubscribeInput } from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { notificationsService } from './notifications.service';

export const notificationsController = {
  async feed(req: Request, res: Response): Promise<void> {
    sendOk(res, await notificationsService.feed(requireAuth(req)));
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    await notificationsService.markAllRead(requireAuth(req));
    sendNoContent(res);
  },

  config(_req: Request, res: Response): void {
    sendOk(res, { publicKey: notificationsService.publicKey() });
  },

  async subscribe(req: Request, res: Response): Promise<void> {
    await notificationsService.subscribe(requireAuth(req), req.body as PushSubscribeInput);
    sendNoContent(res);
  },

  async unsubscribe(req: Request, res: Response): Promise<void> {
    const { endpoint } = req.body as PushUnsubscribeInput;
    await notificationsService.unsubscribe(requireAuth(req), endpoint);
    sendNoContent(res);
  },
};
