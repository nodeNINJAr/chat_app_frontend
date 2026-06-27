"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { CallProvider } from "@/components/call-provider";
import { SocketProvider } from "@/components/socket-provider";
import { Toaster } from "@/components/ui/sonner";
import { refreshAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { getMe } from "@/lib/api";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    if (status !== "idle") return;
    setStatus("loading");
    refreshAccessToken()
      .then(async (token) => {
        if (!token) {
          setStatus("unauthenticated");
          return;
        }
        const me = await getMe();
        setAuth(token, {
          id: me.id,
          username: me.username,
          displayName: me.displayName,
        });
      })
      .catch(() => setStatus("unauthenticated"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <SocketProvider>
            <CallProvider>{children}</CallProvider>
          </SocketProvider>
        </AuthBootstrap>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
