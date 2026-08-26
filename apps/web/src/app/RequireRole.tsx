import { ROLE_RANK, type Role } from '@ewp/contracts';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/features/auth';

/**
 * Route-level role gate. The API refuses these calls anyway, so this exists to
 * avoid showing somebody a page that can only fail - not as the security
 * boundary itself.
 */
export function RequireRole({
  minRole,
  children,
}: {
  minRole: Role;
  children: React.ReactNode;
}) {
  const { user, status } = useAuth();

  if (status === 'loading') return null;
  if (!user || ROLE_RANK[user.role] < ROLE_RANK[minRole]) return <Navigate to="/" replace />;

  return <>{children}</>;
}
