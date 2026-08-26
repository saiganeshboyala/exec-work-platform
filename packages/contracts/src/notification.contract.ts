import { z } from 'zod';

/**
 * The browser hands us a PushSubscription object; these are the only parts of
 * it the server needs in order to encrypt and deliver a message.
 */
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
  userAgent: z.string().max(300).optional(),
});
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().url().max(2000) });
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeedDto {
  items: NotificationDto[];
  unreadCount: number;
}

/** Empty publicKey means push is not configured; the UI hides the prompt. */
export interface PushConfigDto {
  publicKey: string | null;
}
