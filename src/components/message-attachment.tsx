"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon, Download, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { getDownloadUrl } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ChatMessage } from "@/lib/types";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioMessagePlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration) audio.currentTime = 0;
    audio.play();
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displaySeconds = playing || currentTime > 0 ? currentTime : duration;

  return (
    <div className="flex w-64 items-center gap-2 rounded-full bg-black/5 px-3 py-2">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        onClick={toggle}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
      </button>
      <div
        onClick={handleSeek}
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-black/10"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatDuration(displaySeconds)}
      </span>
    </div>
  );
}

// content.mediaUrl holds the storage *key*, not a renderable URL (S3/local-disk
// download URLs are short-lived signed links) — resolve a fresh one on render.
export function MessageAttachment({ message }: { message: ChatMessage }) {
  const key = message.content.mediaUrl;
  const [viewerOpen, setViewerOpen] = useState(false);
  const { data: url } = useQuery({
    queryKey: ["download-url", key],
    queryFn: () => getDownloadUrl(key as string),
    enabled: !!key,
    staleTime: 4 * 60 * 1000,
  });

  if (!key) return null;

  if (!url) {
    return (
      <div className="h-32 w-48 animate-pulse rounded-md bg-black/10" />
    );
  }

  if (message.type === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="block cursor-zoom-in"
        >
          <Image
            src={url}
            alt={message.content.fileName ?? "image"}
            width={288}
            height={288}
            unoptimized={!url.startsWith(apiOrigin)}
            className="h-auto max-h-72 w-auto max-w-72 rounded-md object-cover"
          />
        </button>
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="flex max-w-[calc(100%-2rem)] items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
            <div className="relative h-[85vh] w-full max-w-3xl">
              <Image
                src={url}
                alt={message.content.fileName ?? "image"}
                fill
                unoptimized={!url.startsWith(apiOrigin)}
                className="rounded-md object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (message.type === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="max-h-72 max-w-72 rounded-md bg-black"
      />
    );
  }

  if (message.type === "audio") {
    return <AudioMessagePlayer url={url} />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={message.content.fileName ?? undefined}
      className="flex items-center gap-2 rounded-md bg-black/5 px-3 py-2 text-sm hover:bg-black/10"
    >
      <FileIcon className="size-4 shrink-0" />
      <span className="truncate">{message.content.fileName ?? "file"}</span>
      <Download className="size-3.5 shrink-0 opacity-60" />
    </a>
  );
}
