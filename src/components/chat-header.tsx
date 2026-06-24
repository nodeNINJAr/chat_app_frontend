"use client";

import { Info, Phone, Search, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useConversationDisplay } from "@/hooks/use-conversation-display";
import { initials } from "@/lib/format";
import { useRealtimeStore } from "@/lib/realtime-store";
import type { ConversationSummary } from "@/lib/types";

export function ChatHeader({
  conversation,
  typingUserIds,
  onOpenInfo,
  onOpenSearch,
  onStartCall,
}: {
  conversation: ConversationSummary | undefined;
  typingUserIds: Set<string> | undefined;
  onOpenInfo: () => void;
  onOpenSearch: () => void;
  onStartCall?: (type: "audio" | "video") => void;
}) {
  const { name, avatarUrl, isGroup, peerId, group } = useConversationDisplay(conversation);
  const isPeerOnline = useRealtimeStore((s) => (peerId ? s.onlineUserIds.has(peerId) : false));
  const isSomeoneTyping = !!typingUserIds && typingUserIds.size > 0;

  const subtitle = isGroup
    ? `${group?.memberCount ?? "…"} members`
    : isSomeoneTyping
      ? "typing…"
      : isPeerOnline
        ? "online"
        : "offline";

  return (
    <header className="flex items-center gap-3 border-b p-3">
      <Avatar>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external/signed URL */}
        {avatarUrl && <img src={avatarUrl} alt={name} />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <button onClick={onOpenInfo} className="flex-1 overflow-hidden text-left">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </button>
      {!isGroup && onStartCall && (
        <>
          <Button variant="ghost" size="icon" onClick={() => onStartCall("audio")}>
            <Phone className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onStartCall("video")}>
            <Video className="size-4" />
          </Button>
        </>
      )}
      <Button variant="ghost" size="icon" onClick={onOpenSearch}>
        <Search className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onOpenInfo}>
        <Info className="size-4" />
      </Button>
    </header>
  );
}
