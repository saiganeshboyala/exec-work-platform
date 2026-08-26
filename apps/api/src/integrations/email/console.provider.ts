import { logger } from '@/common/logger';

import type { EmailMessage, EmailProvider, EmailResult } from './email.types';

/** Development provider: prints instead of sending. Never enabled in production. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<EmailResult> {
    logger.info({ to: message.to, subject: message.subject, body: message.text }, 'Email (not sent)');
    return { messageId: `console-${Date.now()}`, deliveredAt: new Date() };
  }
}
