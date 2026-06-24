"use client";

import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/use-user-profile";
import { CALL_END_REASON_MESSAGE, useCallStore } from "@/lib/call-store";
import { initials } from "@/lib/format";

function useElapsedSeconds(startedAt: number | null) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return seconds;
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CallScreen() {
  const phase = useCallStore((s) => s.phase);
  const peerId = useCallStore((s) => s.peerId);
  const type = useCallStore((s) => s.type);
  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const startedAt = useCallStore((s) => s.startedAt);
  const endReason = useCallStore((s) => s.endReason);
  const cancelCall = useCallStore((s) => s.cancelCall);
  const endCall = useCallStore((s) => s.endCall);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const dismissEnded = useCallStore((s) => s.dismissEnded);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { data: peer } = useUserProfile(peerId ?? undefined);
  const elapsed = useElapsedSeconds(startedAt);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (phase === "ended") {
      const t = setTimeout(dismissEnded, 2000);
      return () => clearTimeout(t);
    }
  }, [phase, dismissEnded]);

  if (phase === "idle" || phase === "incoming-ringing") return null;

  const isVideo = type === "video";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {isVideo && phase === "active" ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <audio ref={remoteAudioRef} autoPlay />
      )}

      <div className="relative flex flex-1 flex-col items-center justify-center gap-3">
        {(!isVideo || phase !== "active") && (
          <Avatar className="size-24">
            <AvatarFallback className="text-3xl">
              {initials(peer?.displayName ?? "?")}
            </AvatarFallback>
          </Avatar>
        )}
        <p className="text-xl font-medium">{peer?.displayName ?? "…"}</p>
        <p className="text-sm text-white/70">
          {phase === "outgoing-ringing" && "Ringing…"}
          {phase === "connecting" && "Connecting…"}
          {phase === "active" && formatDuration(elapsed)}
          {phase === "ended" && (endReason ? CALL_END_REASON_MESSAGE[endReason] : "Call ended")}
        </p>
      </div>

      {isVideo && localStream && phase !== "ended" && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute right-4 bottom-28 h-40 w-28 rounded-md object-cover ring-1 ring-white/20"
        />
      )}

      {phase !== "ended" && (
        // relative + z-10: the full-screen video above is `absolute`, which paints
        // above static in-flow siblings regardless of DOM order — without this the
        // video intercepts every click on these buttons.
        <div className="relative z-10 flex items-center justify-center gap-4 p-8">
          <Button
            size="icon"
            variant="secondary"
            className="size-12 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </Button>
          {isVideo && (
            <Button
              size="icon"
              variant="secondary"
              className="size-12 rounded-full"
              onClick={toggleCamera}
            >
              {isCameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
            </Button>
          )}
          <Button
            size="icon"
            className="size-14 rounded-full bg-destructive hover:bg-destructive/90"
            onClick={phase === "outgoing-ringing" ? cancelCall : endCall}
          >
            <PhoneOff className="size-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
