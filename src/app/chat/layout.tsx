"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  // Below md, show either the conversation list or the open conversation,
  // never both — there isn't room for the WhatsApp-style two-pane layout.
  const conversationOpen = pathname !== "/chat" && pathname?.startsWith("/chat/");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div
        className={cn(
          "w-full shrink-0 md:w-80",
          conversationOpen && "hidden md:block",
        )}
      >
        <Sidebar />
      </div>
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          !conversationOpen && "hidden md:flex",
        )}
      >
        {children}
      </main>
    </div>
  );
}
