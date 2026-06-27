"use client";

import { Mic, Paperclip, Square, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/types";

function formatRecordingTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MessageComposer({
  draft,
  onDraftChange,
  replyTarget,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSubmit,
  onUploadFile,
  uploading,
  disabledReason,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  replyTarget: ChatMessage | null;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
  onCancelEdit: () => void;
  onSubmit: () => void;
  onUploadFile: (file: File) => void;
  uploading: boolean;
  disabledReason?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dummy, setDummy] = useState(0); // forces remount of file input after each pick

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Stops the mic stream and the elapsed-time interval if the composer
  // unmounts mid-recording (e.g. navigating away from the chat).
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast.error("File is too large (max 200MB)");
      setDummy((d) => d + 1);
      return;
    }
    onUploadFile(file);
    setDummy((d) => d + 1);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Couldn't access the microphone");
    }
  }

  function stopRecording(send: boolean) {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recorder.onstop = () => {
      const chunks = recordedChunksRef.current;
      recordedChunksRef.current = [];
      if (send && chunks.length > 0) {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        onUploadFile(new File([blob], "voice-message.webm", { type: blob.type }));
      }
    };
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  if (disabledReason && !editingMessage) {
    return (
      <div className="border-t p-3">
        <div className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          {disabledReason}
        </div>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="border-t p-3">
        <div className="flex items-center gap-3">
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="flex-1 text-sm tabular-nums text-muted-foreground">
            {formatRecordingTime(recordingSeconds)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => stopRecording(false)}>
            <Trash2 className="size-4" />
          </Button>
          <Button size="icon" onClick={() => stopRecording(true)}>
            <Square className="size-3.5 fill-current" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t">
      {(replyTarget || editingMessage) && (
        <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2 text-sm">
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground">
              {editingMessage ? "Editing message" : "Replying to"}
            </p>
            <p className="truncate">
              {(editingMessage ?? replyTarget)?.content.text ??
                `[${(editingMessage ?? replyTarget)?.type}]`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={editingMessage ? onCancelEdit : onCancelReply}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex items-center gap-2 p-3"
      >
        <input
          key={dummy}
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFilePick}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </Button>
        <Input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={uploading ? "Uploading…" : "Type a message…"}
          autoComplete="off"
          disabled={uploading}
        />
        {!draft.trim() && !editingMessage ? (
          <Button
            type="button"
            size="icon"
            disabled={uploading}
            onClick={startRecording}
          >
            <Mic className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={!draft.trim() || uploading}>
            {editingMessage ? "Save" : "Send"}
          </Button>
        )}
      </form>
    </div>
  );
}
