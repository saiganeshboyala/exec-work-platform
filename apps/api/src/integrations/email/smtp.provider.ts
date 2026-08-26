import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '@/config';

import type { EmailMessage, EmailProvider, EmailResult } from './email.types';

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const info = await this.transporter.sendMail({ from: env.EMAIL_FROM, ...message });
    return { messageId: info.messageId, deliveredAt: new Date() };
  }
}
