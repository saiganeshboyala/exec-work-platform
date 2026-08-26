import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { Spinner } from '@/shared/components/Spinner';

/** Route guard. The API enforces access too - this only avoids dead screens. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner label="Checking your session" />;
  if (status === 'anonymous') return <Navigate to="/sign-in" state={{ from: location }} replace />;

  return <>{children}</>;
}
