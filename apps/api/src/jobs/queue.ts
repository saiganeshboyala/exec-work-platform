import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '@/config';

export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

/** Job names are constants so producers and workers cannot drift apart. */
export const JobName = {
  SEND_INVITATION_EMAIL: 'send-invitation-email',
  SEND_DUE_REMINDER: 'send-due-reminder',
  REBUILD_DASHBOARD_SNAPSHOT: 'rebuild-dashboard-snapshot',
} as const;

export type JobNameValue = (typeof JobName)[keyof typeof JobName];

export interface SendInvitationEmailPayload {
  invitationId: string;
  /** The raw token. Only its hash is stored, so it travels on the payload. */
  token: string;
}

export const emailQueue = new Queue('email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 86_400, count: 1_000 },
    removeOnFail: { age: 604_800 },
  },
});

export async function closeQueues(): Promise<void> {
  await emailQueue.close();
  redisConnection.disconnect();
}
