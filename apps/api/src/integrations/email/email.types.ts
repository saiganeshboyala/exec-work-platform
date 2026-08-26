export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  messageId: string;
  deliveredAt: Date;
}

/**
 * Every email provider implements this. Swapping SES for Postmark should touch
 * exactly one file - the adapter - and nothing in the modules.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailResult>;
}
