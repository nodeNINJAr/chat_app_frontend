"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon, Download } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { getDownloadUrl } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ChatMessage } from "@/lib/types";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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
