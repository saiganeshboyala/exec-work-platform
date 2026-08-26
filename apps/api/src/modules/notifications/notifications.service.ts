import type { NotificationDto, NotificationFeedDto, PushSubscribeInput } from '@ewp/contracts';
import webpush from 'web-push';

import { logger } from '@/common/logger';
import type { AuthContext } from '@/common/types/express';
import { env } from '@/config';
import { prisma } from '@/database';

const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY as string,
    env.VAPID_PRIVATE_KEY as string,
  );
} else {
  logger.warn('VAPID keys absent - browser push disabled, in-app notifications still recorded');
}

interface NotifyInput {
  organizationId: string;
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

function toDto(row: {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    url: row.url,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const notificationsService = {
  /**
   * Records the notification for every recipient, then attempts a browser push
   * to each of their registered devices. Delivery is best effort by design: a
   * dead endpoint is pruned, and no failure here is allowed to fail the action
   * that triggered it.
   */
  async notify(input: NotifyInput): Promise<void> {
    const recipients = [...new Set(input.userIds)].filter(Boolean);
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        organizationId: input.organizationId,
        userId,
        title: input.title,
        body: input.body,
        url: input.url ?? null,
      })),
    });

    if (!pushEnabled) return;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: recipients } },
    });

    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      url: input.url ?? '/',
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // 404/410 mean the browser threw the subscription away.
          if (status === 404 || status === 410) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
            return;
          }
          logger.warn({ err: error, userId: subscription.userId }, 'Push delivery failed');
        }
      }),
    );
  },

  async feed(auth: AuthContext, take = 30): Promise<NotificationFeedDto> {
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: auth.userId, organizationId: auth.organizationId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.notification.count({
        where: { userId: auth.userId, organizationId: auth.organizationId, readAt: null },
      }),
    ]);

    return { items: rows.map(toDto), unreadCount };
  },

  async markAllRead(auth: AuthContext): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, organizationId: auth.organizationId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async subscribe(auth: AuthContext, input: PushSubscribeInput): Promise<void> {
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
        userId: auth.userId,
        organizationId: auth.organizationId,
      },
      // Re-registering on a shared machine must re-point the device at whoever
      // is signed in now, or they would receive the previous user's alerts.
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userId: auth.userId,
        organizationId: auth.organizationId,
      },
    });
  },

  async unsubscribe(auth: AuthContext, endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: auth.userId } });
  },

  publicKey(): string | null {
    return pushEnabled ? (env.VAPID_PUBLIC_KEY as string) : null;
  },
};
