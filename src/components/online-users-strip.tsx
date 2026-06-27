"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { initials } from "@/lib/format";
import { useRealtimeStore } from "@/lib/realtime-store";
import type { ConversationSummary } from "@/lib/types";

function OnlinePersonAvatar({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const { data: profile } = useUserProfile(userId);

  return (
    <Link
      href={`/chat/${conversationId}`}
      className="flex w-14 shrink-0 flex-col items-center gap-1"
    >
      <div className="relative">
        <Avatar className="size-12">
          {profile?.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
          )}
          <AvatarFallback>{initials(profile?.displayName ?? "?")}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 ring-2 ring-background" />
      </div>
      <span className="w-full truncate text-center text-[11px] text-muted-foreground">
        {profile?.displayName ?? "…"}
      </span>
    </Link>
  );
}

export function OnlineUsersStrip({
  conversations,
}: {
  conversations: ConversationSummary[] | undefined;
}) {
  const onlineUserIds = useRealtimeStore((s) => s.onlineUserIds);

  const onlinePeople = (conversations ?? [])
    .filter((c) => c.type === "direct" && onlineUserIds.has(c.otherParticipantIds[0]))
    .map((c) => ({ conversationId: c.id, userId: c.otherParticipantIds[0] }));

  if (onlinePeople.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto border-b p-3">
      {onlinePeople.map(({ conversationId, userId }) => (
        <OnlinePersonAvatar key={conversationId} conversationId={conversationId} userId={userId} />
      ))}
    </div>
  );
}
