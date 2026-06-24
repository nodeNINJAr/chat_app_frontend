"use client";

import { useQuery } from "@tanstack/react-query";
import { Phone, PhoneMissed, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserProfile } from "@/hooks/use-user-profile";
import { getCallHistory } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatTimestamp, initials } from "@/lib/format";
import type { CallRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function CallRow({ call }: { call: CallRecord }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const wasOutgoing = call.callerId === currentUserId;
  const peerId = wasOutgoing ? call.calleeId : call.callerId;
  const { data: peer } = useUserProfile(peerId);
  const missed = call.status === "missed" || call.status === "rejected";

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2">
      <Avatar>
        <AvatarFallback>{initials(peer?.displayName ?? "?")}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium">{peer?.displayName ?? "…"}</p>
        <p
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground",
            missed && "text-destructive",
          )}
        >
          {missed ? <PhoneMissed className="size-3" /> : <Phone className="size-3" />}
          {wasOutgoing ? "Outgoing" : "Incoming"} · {call.type}
          {call.durationSec ? ` · ${Math.round(call.durationSec / 60)}m` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {call.type === "video" && <Video className="size-3.5" />}
        {formatTimestamp(call.startedAt)}
      </div>
    </div>
  );
}

export default function CallHistoryPage() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ["call-history"],
    queryFn: getCallHistory,
  });

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto flex max-w-lg flex-col gap-2 p-6">
        <h1 className="mb-2 text-lg font-semibold">Call history</h1>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {calls?.length === 0 && (
          <p className="text-sm text-muted-foreground">No calls yet.</p>
        )}
        {calls?.map((c) => <CallRow key={c.id} call={c} />)}
      </div>
    </ScrollArea>
  );
}
