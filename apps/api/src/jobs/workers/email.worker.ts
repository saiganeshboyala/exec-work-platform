import { Worker } from 'bullmq';

import { logger } from '@/common/logger';
import { deliverInvitationEmail } from '@/modules/members';

import { JobName, redisConnection, type SendInvitationEmailPayload } from '../queue';

/**
 * Email delivery runs out of band so a slow provider can never slow down an
 * HTTP request. Failures retry with exponential backoff and land in the dead
 * letter set after five attempts.
 */
export function startEmailWorker(): Worker {
  const worker = new Worker(
    'email',
    async (job) => {
      switch (job.name) {
        case JobName.SEND_INVITATION_EMAIL: {
          const { invitationId, token } = job.data as SendInvitationEmailPayload;
          await deliverInvitationEmail(invitationId, token);
          return;
        }
        default:
          logger.warn({ jobName: job.name }, 'No handler registered for job');
      }
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err: error }, 'Job failed');
  });

  return worker;
}
