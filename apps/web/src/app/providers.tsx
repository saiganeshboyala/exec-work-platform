import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/features/auth';

/**
 * All cross-cutting providers, in one place and in a fixed order. Nothing else
 * in the app is allowed to create a QueryClient.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // Never retry a rejection the user has to act on.
              const status = (error as { status?: number }).status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            staleTime: 30_000,
            // Several people work the same board at once, so a screen left open
            // has to catch up on its own rather than waiting to be reloaded.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchInterval: 60_000,
            // Polling a background tab wastes the server's time and the
            // laptop's battery; focus brings it up to date anyway.
            refetchIntervalInBackground: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
