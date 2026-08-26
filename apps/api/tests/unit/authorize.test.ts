import { ROLE_RANK } from '@ewp/contracts';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../src/common/errors';
import { authorize } from '../../src/common/middleware/authorize';

function run(role: Parameters<typeof authorize>[0] | undefined, minimum: Parameters<typeof authorize>[0]) {
  const req = { auth: role ? { userId: 'u', organizationId: 'o', role } : undefined } as Request;
  const next = vi.fn() as unknown as NextFunction;
  authorize(minimum)(req, {} as Response, next);
  return next as unknown as ReturnType<typeof vi.fn>;
}

describe('authorize', () => {
  it('admits a role above the minimum', () => {
    expect(run('ADMIN', 'MANAGER')).toHaveBeenCalledWith();
  });

  it('admits the minimum role itself', () => {
    expect(run('MANAGER', 'MANAGER')).toHaveBeenCalledWith();
  });

  it('rejects a role below the minimum', () => {
    const next = run('VIEWER', 'MANAGER');
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0]?.[0].statusCode).toBe(403);
  });

  it('rejects an unauthenticated request', () => {
    const next = run(undefined, 'VIEWER');
    expect(next.mock.calls[0]?.[0].statusCode).toBe(401);
  });

  it('keeps the rank ladder ordered', () => {
    expect(ROLE_RANK.OWNER).toBeGreaterThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeGreaterThan(ROLE_RANK.MANAGER);
    expect(ROLE_RANK.MEMBER).toBeGreaterThan(ROLE_RANK.VIEWER);
  });
});
