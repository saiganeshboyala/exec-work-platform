import { z } from 'zod';

import { emailSchema } from './common';

/**
 * Password policy lives here so the browser and the server enforce exactly the
 * same rule. Never duplicate it in a form component.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128)
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number');

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(120).trim(),
  fullName: z.string().min(2).max(120).trim(),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Self-service signup: asks to join the existing organisation rather than
 * creating a new one. The resulting membership is PENDING until an
 * administrator approves it, so registering grants no access by itself.
 */
export const signUpSchema = z.object({
  fullName: z.string().min(2).max(120).trim(),
  email: emailSchema,
  password: passwordSchema,
  jobTitle: z.string().max(120).trim().optional(),
  /** Optional note to whoever reviews the request. */
  message: z.string().max(300).trim().optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export interface SignUpResultDto {
  status: 'PENDING';
  message: string;
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshInput = z.infer<typeof refreshSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(20),
  fullName: z.string().min(2).max(120).trim(),
  password: passwordSchema,
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
