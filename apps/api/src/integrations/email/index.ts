import { env, isProduction } from '@/config';

import { ConsoleEmailProvider } from './console.provider';
import type { EmailProvider } from './email.types';
import { SmtpEmailProvider } from './smtp.provider';

function createEmailProvider(): EmailProvider {
  if (env.EMAIL_DRIVER === 'smtp') return new SmtpEmailProvider();
  if (isProduction) {
    throw new Error('EMAIL_DRIVER=console is not allowed in production');
  }
  return new ConsoleEmailProvider();
}

export const emailProvider = createEmailProvider();
export type { EmailMessage, EmailProvider, EmailResult } from './email.types';
