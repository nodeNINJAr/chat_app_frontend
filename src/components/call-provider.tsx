"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { CALL_END_REASON_MESSAGE, useCallStore } from "@/lib/call-store";
import { connectCallSocket, disconnectCallSocket } from "@/lib/call-socket";
import { CallScreen } from "@/components/call-screen";
import { IncomingCallDialog } from "@/components/incoming-call-dialog";

export function CallProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      disconnectCallSocket();
      return;
    }
    const socket = connectCallSocket(accessToken);
    const store = useCallStore;

    const onIncoming = ({
      callId,
      callerId,
      type,
    }: {
      callId: string;
      callerId: string;
      type: "audio" | "video";
    }) => store.getState().handleIncoming(callId, callerId, type);

    const onRinging = ({ callId }: { callId: string }) =>
      store.getState().handleRinging(callId);

    const onAccepted = ({ callId }: { callId: string }) =>
      store.getState().handleAccepted(callId);

    const onReject = ({ callId }: { callId: string }) => {
      if (store.getState().callId !== callId) return;
      store.getState().handleRemoteEnd("rejected");
    };

    const onCancelled = ({
      callId,
      reason,
    }: {
      callId: string;
      reason: "caller_cancelled" | "accepted_elsewhere";
    }) => {
      if (store.getState().callId !== callId) return;
      store
        .getState()
        .handleRemoteEnd(reason === "accepted_elsewhere" ? "accepted_elsewhere" : "cancelled");
    };

    const onBusy = () => {
      toast.error(CALL_END_REASON_MESSAGE.busy);
      store.getState().handleRemoteEnd("busy");
    };

    const onError = ({ message }: { message: string }) => {
      toast.error(message);
      store.getState().handleRemoteEnd("error");
    };

    const onTimeout = ({ callId }: { callId: string }) => {
      if (store.getState().callId !== callId) return;
      store.getState().handleRemoteEnd("timeout");
    };

    const onCallEnd = ({ callId }: { callId: string }) => {
      if (store.getState().callId !== callId) return;
      store.getState().handleRemoteEnd("ended");
    };

    const onOffer = ({
      callId,
      sdp,
    }: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => store.getState().handleOffer(callId, sdp);

    const onAnswer = ({
      callId,
      sdp,
    }: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => store.getState().handleAnswer(callId, sdp);

    const onIceCandidate = ({
      callId,
      candidate,
    }: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => store.getState().handleIceCandidate(callId, candidate);

    socket.on("call:incoming", onIncoming);
    socket.on("call:ringing", onRinging);
    socket.on("call:accepted", onAccepted);
    socket.on("call:reject", onReject);
    socket.on("call:cancelled", onCancelled);
    socket.on("call:busy", onBusy);
    socket.on("call:error", onError);
    socket.on("call:timeout", onTimeout);
    socket.on("call:end", onCallEnd);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:ringing", onRinging);
      socket.off("call:accepted", onAccepted);
      socket.off("call:reject", onReject);
      socket.off("call:cancelled", onCancelled);
      socket.off("call:busy", onBusy);
      socket.off("call:error", onError);
      socket.off("call:timeout", onTimeout);
      socket.off("call:end", onCallEnd);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
    };
  }, [accessToken]);

  return (
    <>
      {children}
      <IncomingCallDialog />
      <CallScreen />
    </>
  );
}
