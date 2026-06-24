"use client";

import { Phone, PhoneOff } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useCallStore } from "@/lib/call-store";
import { initials } from "@/lib/format";

export function IncomingCallDialog() {
  const phase = useCallStore((s) => s.phase);
  const peerId = useCallStore((s) => s.peerId);
  const type = useCallStore((s) => s.type);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const rejectCall = useCallStore((s) => s.rejectCall);
  const { data: peer } = useUserProfile(phase === "incoming-ringing" ? peerId ?? undefined : undefined);

  if (phase !== "incoming-ringing") return null;

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-xs">
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar className="size-20">
            <AvatarFallback className="text-2xl">
              {initials(peer?.displayName ?? "?")}
            </AvatarFallback>
          </Avatar>
          <p className="text-lg font-medium">{peer?.displayName ?? "…"}</p>
          <p className="text-sm text-muted-foreground">
            Incoming {type === "video" ? "video" : "audio"} call…
          </p>
          <div className="flex gap-6 pt-2">
            <Button
              size="icon"
              className="size-12 rounded-full bg-destructive hover:bg-destructive/90"
              onClick={rejectCall}
            >
              <PhoneOff className="size-5" />
            </Button>
            <Button
              size="icon"
              className="size-12 rounded-full bg-green-600 hover:bg-green-600/90"
              onClick={acceptCall}
            >
              <Phone className="size-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
