import type { Role } from '@ewp/contracts';

/**
 * Everything the request carries after authentication. Kept minimal on purpose:
 * anything else must be loaded by the service that needs it.
 */
export interface AuthContext {
  userId: string;
  organizationId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      requestId: string;
    }
    interface Locals {
      requestId: string;
    }
  }
}

export {};
