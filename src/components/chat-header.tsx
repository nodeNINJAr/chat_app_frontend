"use client";

import { ArrowLeft, Info, Phone, Search, Users, Video } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 md:hidden"
        nativeButton={false}
        render={<Link href="/chat" />}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <Avatar>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external/signed URL */}
        {avatarUrl && <img src={avatarUrl} alt={name} loading="lazy" decoding="async" />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <button onClick={onOpenInfo} className="flex-1 overflow-hidden text-left">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{name}</span>
          {isGroup && (
            <Badge variant="secondary" className="shrink-0">
              <Users />
              Group
            </Badge>
          )}
        </p>
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
