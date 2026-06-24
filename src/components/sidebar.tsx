"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConversationRow } from "@/components/conversation-row";
import { CreateGroupDialog } from "@/components/create-group-dialog";
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
import { createDirectConversation, getConversations, logout, searchUsers } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { initials } from "@/lib/format";
import { disconnectSocket } from "@/lib/socket";

export function Sidebar() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

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
    <aside className="flex h-full w-80 shrink-0 flex-col border-r">
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

      <div className="p-3">
        <Input
          placeholder="Search people to chat with…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="flex-1">
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
            : conversations?.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={params.conversationId === c.id}
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
