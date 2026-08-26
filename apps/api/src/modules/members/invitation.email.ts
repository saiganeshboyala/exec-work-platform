import type { Role } from '@ewp/contracts';

import type { EmailMessage } from '@/integrations/email';

interface InvitationEmailInput {
  to: string;
  organizationName: string;
  inviterName: string;
  role: Role;
  acceptUrl: string;
  message?: string | null;
}

/**
 * Email copy lives beside the module that sends it. Plain text and HTML are
 * generated from the same content so they never drift.
 */
export function buildInvitationEmail(input: InvitationEmailInput): EmailMessage {
  const subject = `${input.inviterName} added you to ${input.organizationName}`;
  const note = input.message ? `\n\n"${input.message}"\n` : '';

  const text = [
    `${input.inviterName} added you to ${input.organizationName} as ${input.role.toLowerCase()}.`,
    note,
    `Set your password and get started: ${input.acceptUrl}`,
    '',
    'This link stops working in 14 days.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#12151c">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">You have been added to ${escapeHtml(input.organizationName)}</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
        ${escapeHtml(input.inviterName)} added you as <strong>${input.role.toLowerCase()}</strong>.
      </p>
      ${input.message ? `<blockquote style="border-left:3px solid #d7dae0;margin:0 0 16px;padding:4px 0 4px 14px;color:#4a505c">${escapeHtml(input.message)}</blockquote>` : ''}
      <p style="margin:0 0 24px">
        <a href="${input.acceptUrl}" style="display:inline-block;background:#2f3b8c;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:15px">Set your password</a>
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0">This link stops working in 14 days.</p>
    </div>`;

  return { to: input.to, subject, text, html };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });
}
