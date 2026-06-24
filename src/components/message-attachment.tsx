"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon, Download } from "lucide-react";
import { getDownloadUrl } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

// content.mediaUrl holds the storage *key*, not a renderable URL (S3/local-disk
// download URLs are short-lived signed links) — resolve a fresh one on render.
export function MessageAttachment({ message }: { message: ChatMessage }) {
  const key = message.content.mediaUrl;
  const { data: url } = useQuery({
    queryKey: ["download-url", key],
    queryFn: () => getDownloadUrl(key as string),
    enabled: !!key,
    staleTime: 4 * 60 * 1000,
  });

  if (!key) return null;

  if (!url) {
    return (
      <div className="flex h-32 w-48 items-center justify-center rounded-md bg-black/10 text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (message.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary signed-URL host, not worth next/image config
      <img
        src={url}
        alt={message.content.fileName ?? "image"}
        className="max-h-72 max-w-72 rounded-md object-cover"
      />
    );
  }

  if (message.type === "video") {
    return <video src={url} controls className="max-h-72 max-w-72 rounded-md" />;
  }

  if (message.type === "audio") {
    return <audio src={url} controls className="max-w-64" />;
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
