"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConversationRow } from "@/components/conversation-row";
import { OnlineUsersStrip } from "@/components/online-users-strip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createDirectConversation,
  deleteConversationForMe,
  getConversations,
  logout,
  searchUsers,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { initials } from "@/lib/format";
import { disconnectSocket } from "@/lib/socket";
import type { ConversationSummary } from "@/lib/types";

// Only needed once the user opens "New group" — split into its own chunk
// instead of shipping it in the sidebar's initial bundle.
const CreateGroupDialog = dynamic(() =>
  import("@/components/create-group-dialog").then((mod) => mod.CreateGroupDialog),
);

export function Sidebar() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Clears any still-pending delete timers if the sidebar unmounts (e.g.
  // logout) before the 5s undo window elapses, so we don't fire an API call
  // for a session that's no longer authenticated.
  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  function handleDeleteConversation(conversation: ConversationSummary) {
    setPendingDeleteIds((prev) => new Set(prev).add(conversation.id));
    if (params.conversationId === conversation.id) {
      router.push("/chat");
    }

    const timer = setTimeout(async () => {
      deleteTimers.current.delete(conversation.id);
      try {
        await deleteConversationForMe(conversation.id);
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } catch {
        toast.error("Failed to delete chat");
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(conversation.id);
          return next;
        });
      }
    }, 5000);
    deleteTimers.current.set(conversation.id, timer);

    toast("Chat deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = deleteTimers.current.get(conversation.id);
          if (pending) {
            clearTimeout(pending);
            deleteTimers.current.delete(conversation.id);
          }
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(conversation.id);
            return next;
          });
        },
      },
    });
  }

  const { data: searchResults } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  async function startConversation(userId: string) {
    const conversation = await createDirectConversation(userId);
    setQuery("");
    router.push(`/chat/${conversation.id}`);
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      disconnectSocket();
      clearAuth();
      router.push("/login");
    }
  }

  const showResults = debouncedQuery.length > 0;

  return (
    <aside className="flex h-full w-full flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar className="size-8">
            <AvatarFallback>{initials(user?.displayName ?? "?")}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{user?.displayName}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateGroupOpen(true)}>
              New group
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/chat/calls" />}>
              Call history
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/chat/settings" />}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!query && <OnlineUsersStrip conversations={conversations} />}

      <div className="p-3">
        <Input
          placeholder="Search people to chat with…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-2">
          {showResults
            ? searchResults
                ?.filter((u) => u.id !== user?.id)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
                  >
                    <Avatar>
                      <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium">{u.displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{u.username}
                      </p>
                    </div>
                  </button>
                ))
            : conversationsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))
              : conversations
                  ?.filter((c) => !pendingDeleteIds.has(c.id))
                  .map((c) => (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      active={params.conversationId === c.id}
                      onDelete={handleDeleteConversation}
                    />
                  ))}
          {showResults && searchResults?.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No users found.</p>
          )}
          {!showResults && conversations?.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No conversations yet. Search for someone to start chatting.
            </p>
          )}
        </div>
      </ScrollArea>
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </aside>
  );
}
