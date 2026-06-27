"use client";

import { Check, CheckCheck, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useConversationDisplay } from "@/hooks/use-conversation-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp, initials } from "@/lib/format";
import { useRealtimeStore } from "@/lib/realtime-store";
import type { ConversationSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConversationRow({
  conversation,
  active,
  onDelete,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onDelete: (conversation: ConversationSummary) => void;
}) {
  const { name, avatarUrl, peerId, isGroup } = useConversationDisplay(conversation);
  const isOnline = useRealtimeStore((s) => (peerId ? s.onlineUserIds.has(peerId) : false));

  const preview = conversation.lastMessage?.preview ?? "No messages yet";

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <div className="relative">
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        {!isGroup && isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate text-sm font-medium">
            <span className="truncate">{name}</span>
            {isGroup && (
              <Badge variant="secondary" className="shrink-0">
                <Users />
                Group
              </Badge>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatTimestamp(conversation.lastMessageAt)}
          </span>
        </div>
        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
          {conversation.lastMessageStatus &&
            (conversation.lastMessageStatus === "read" ? (
              <CheckCheck className="size-3.5 shrink-0 text-primary" />
            ) : (
              <Check className="size-3.5 shrink-0" />
            ))}
          <span className="truncate">{preview}</span>
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {conversation.unreadCount}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(conversation);
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </Link>
  );
}
