import { loginSchema, refreshSchema, registerSchema, signUpSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, authRateLimit, validate } from '@/common/middleware';

import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  asyncHandler(authController.register),
);

// Public: anyone may ask to join. Approval is what actually grants access.
authRouter.post(
  '/sign-up',
  authRateLimit,
  validate(signUpSchema),
  asyncHandler(authController.signUp),
);

authRouter.post('/login', authRateLimit, validate(loginSchema), asyncHandler(authController.login));
authRouter.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));
authRouter.post('/logout', validate(refreshSchema), asyncHandler(authController.logout));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
