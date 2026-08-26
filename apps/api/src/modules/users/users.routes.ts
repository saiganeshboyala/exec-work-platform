import { updateProfileSchema } from '@ewp/contracts';
import { Router } from 'express';

import { asyncHandler } from '@/common/http';
import { authenticate, validate } from '@/common/middleware';

import { usersController } from './users.controller';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.patch('/me', validate(updateProfileSchema), asyncHandler(usersController.updateMe));
usersRouter.get('/:id', asyncHandler(usersController.getById));
