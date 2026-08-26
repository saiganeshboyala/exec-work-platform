import type { Server } from 'node:http';

import { logger } from '@/common/logger';
import { env } from '@/config';
import { connectDatabase, disconnectDatabase } from '@/database';
import { closeQueues, startEmailWorker } from '@/jobs';

import { createApp } from './app';

/**
 * Process entrypoint. Everything here is about lifecycle: connect, listen,
 * and shut down cleanly so in-flight requests and jobs are not cut off.
 */
async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const worker = startEmailWorker();

  const server: Server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down');

    server.close(async () => {
      try {
        await worker.close();
        await closeQueues();
        await disconnectDatabase();
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Shutdown failed');
        process.exit(1);
      }
    });

    // Do not hang forever if a connection refuses to close.
    setTimeout(() => process.exit(1), 15_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

void bootstrap();
