'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

function ThemeManager() {
  const theme = useStore((s) => s.theme);
  const user = useStore((s) => s.user);

  useEffect(() => {
    const effectiveTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [theme, user?.theme]);

  return null;
}

function RealtimeManager() {
  const { isAuthenticated, accessToken, connectSocket, disconnectSocket } = useStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    accessToken: s.accessToken,
    connectSocket: s.connectSocket,
    disconnectSocket: s.disconnectSocket,
  }));

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
    } else {
      disconnectSocket();
    }
    return () => { disconnectSocket(); };
  }, [isAuthenticated, accessToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,        // 30s
            gcTime: 5 * 60 * 1000,       // 5min cache
            retry: (failureCount, error) => {
              const err = error as { statusCode?: number };
              // Don't retry auth errors
              if (err?.statusCode === 401 || err?.statusCode === 403) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <RealtimeManager />
      {children}
      <div id="toast-root" />
      <div id="modal-root" />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
