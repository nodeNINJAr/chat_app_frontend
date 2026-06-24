import { create } from "zustand";
import { getTurnCredentials } from "./api";
import { getCallSocket } from "./call-socket";
import { buildIceServers } from "./webrtc";

export type CallPhase =
  | "idle"
  | "outgoing-ringing"
  | "incoming-ringing"
  | "connecting"
  | "active"
  | "ended";

export type CallEndReason =
  | "rejected"
  | "cancelled"
  | "busy"
  | "timeout"
  | "ended"
  | "error"
  | "accepted_elsewhere";

export const CALL_END_REASON_MESSAGE: Record<CallEndReason, string> = {
  rejected: "Call declined",
  cancelled: "Call cancelled",
  busy: "User is on another call",
  timeout: "No answer",
  ended: "Call ended",
  error: "Call failed — check microphone/camera permissions",
  accepted_elsewhere: "Accepted on another device",
};

interface CallState {
  phase: CallPhase;
  callId: string | null;
  peerId: string | null;
  type: "audio" | "video" | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  startedAt: number | null;
  endReason: CallEndReason | null;

  startCall: (calleeId: string, type: "audio" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  dismissEnded: () => void;

  handleIncoming: (callId: string, callerId: string, type: "audio" | "video") => void;
  handleRinging: (callId: string) => void;
  handleAccepted: (callId: string) => Promise<void>;
  handleOffer: (callId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleAnswer: (callId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (callId: string, candidate: RTCIceCandidateInit) => Promise<void>;
  handleRemoteEnd: (reason: CallEndReason) => void;
}

let pc: RTCPeerConnection | null = null;
let pendingCandidates: RTCIceCandidateInit[] = [];

function mediaConstraints(type: "audio" | "video"): MediaStreamConstraints {
  return { audio: true, video: type === "video" };
}

function teardownPeerConnection() {
  pc?.close();
  pc = null;
  pendingCandidates = [];
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export const useCallStore = create<CallState>((set, get) => ({
  phase: "idle",
  callId: null,
  peerId: null,
  type: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  startedAt: null,
  endReason: null,

  startCall: async (calleeId, type) => {
    if (get().phase !== "idle") return;
    try {
      const localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints(type));
      set({
        phase: "outgoing-ringing",
        peerId: calleeId,
        type,
        localStream,
        endReason: null,
      });
      getCallSocket()?.emit("call:initiate", { calleeId, type });
    } catch {
      set({ endReason: "error", phase: "ended" });
    }
  },

  acceptCall: async () => {
    const { callId, type } = get();
    if (!callId || !type) return;
    try {
      const localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints(type));
      set({ phase: "connecting", localStream });

      const creds = await getTurnCredentials();
      pc = new RTCPeerConnection({ iceServers: buildIceServers(creds) });
      localStream.getTracks().forEach((track) => pc?.addTrack(track, localStream));
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          getCallSocket()?.emit("call:ice-candidate", {
            callId,
            candidate: e.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (e) => {
        set({ remoteStream: e.streams[0] });
      };

      getCallSocket()?.emit("call:accept", { callId });
    } catch {
      get().handleRemoteEnd("error");
    }
  },

  rejectCall: () => {
    const { callId } = get();
    if (callId) getCallSocket()?.emit("call:reject", { callId });
    get().handleRemoteEnd("rejected");
  },

  cancelCall: () => {
    const { callId } = get();
    if (callId) getCallSocket()?.emit("call:cancel", { callId });
    get().handleRemoteEnd("cancelled");
  },

  endCall: () => {
    const { callId } = get();
    if (callId) getCallSocket()?.emit("call:end", { callId });
    get().handleRemoteEnd("ended");
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    localStream?.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    set({ isCameraOff: !isCameraOff });
  },

  dismissEnded: () => {
    set({
      phase: "idle",
      callId: null,
      peerId: null,
      type: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      startedAt: null,
      endReason: null,
    });
  },

  handleIncoming: (callId, callerId, type) => {
    if (get().phase !== "idle") {
      // Already on a call elsewhere/another tab — let the timeout/busy path handle it server-side.
      return;
    }
    set({ phase: "incoming-ringing", callId, peerId: callerId, type, endReason: null });
  },

  handleRinging: (callId) => {
    set({ callId });
  },

  handleAccepted: async (callId) => {
    const { localStream } = get();
    if (!localStream || get().callId !== callId) return;
    try {
      const creds = await getTurnCredentials();
      pc = new RTCPeerConnection({ iceServers: buildIceServers(creds) });
      localStream.getTracks().forEach((track) => pc?.addTrack(track, localStream));
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          getCallSocket()?.emit("call:ice-candidate", {
            callId,
            candidate: e.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (e) => {
        set({ remoteStream: e.streams[0] });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getCallSocket()?.emit("call:offer", { callId, sdp: offer });
      set({ phase: "connecting" });
    } catch {
      get().handleRemoteEnd("error");
    }
  },

  handleOffer: async (callId, sdp) => {
    if (!pc || get().callId !== callId) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    for (const candidate of pendingCandidates) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidates = [];
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    getCallSocket()?.emit("call:answer", { callId, sdp: answer });
    set({ phase: "active", startedAt: Date.now() });
  },

  handleAnswer: async (callId, sdp) => {
    if (!pc || get().callId !== callId) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    for (const candidate of pendingCandidates) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidates = [];
    set({ phase: "active", startedAt: Date.now() });
  },

  handleIceCandidate: async (callId, candidate) => {
    if (get().callId !== callId) return;
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(candidate);
    } else {
      pendingCandidates.push(candidate);
    }
  },

  handleRemoteEnd: (reason) => {
    const { localStream, remoteStream } = get();
    stopStream(localStream);
    stopStream(remoteStream);
    teardownPeerConnection();
    set({ phase: "ended", endReason: reason });
  },
}));
