"use client";

import Link from "next/link";
import { useConversationDisplay } from "@/hooks/use-conversation-display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatTimestamp, initials } from "@/lib/format";
import { useRealtimeStore } from "@/lib/realtime-store";
import type { ConversationSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConversationRow({
  conversation,
  active,
}: {
  conversation: ConversationSummary;
  active: boolean;
}) {
  const { name, peerId, isGroup } = useConversationDisplay(conversation);
  const isOnline = useRealtimeStore((s) => (peerId ? s.onlineUserIds.has(peerId) : false));

  const preview = conversation.lastMessage?.preview ?? "No messages yet";

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <div className="relative">
        <Avatar>
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        {!isGroup && isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatTimestamp(conversation.lastMessageAt)}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{preview}</p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {conversation.unreadCount}
        </span>
      )}
    </Link>
  );
}
