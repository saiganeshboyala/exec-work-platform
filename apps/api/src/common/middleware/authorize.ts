import { ROLE_RANK, type Role } from '@ewp/contracts';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '@/common/errors';

/**
 * Role gate. Roles are ranked, so `authorize('MANAGER')` also admits ADMIN and
 * OWNER. Resource-level checks (does this board belong to my org?) belong in the
 * service layer, not here.
 */
export function authorize(minimumRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(AppError.unauthenticated());
      return;
    }

    if (ROLE_RANK[req.auth.role] < ROLE_RANK[minimumRole]) {
      next(AppError.forbidden(`This action needs the ${minimumRole.toLowerCase()} role or above`));
      return;
    }

    next();
  };
}
