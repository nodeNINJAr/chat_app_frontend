"use client";

import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/types";

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

  if (disabledReason && !editingMessage) {
    return (
      <div className="border-t p-3">
        <div className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          {disabledReason}
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
        <Button type="submit" disabled={!draft.trim() || uploading}>
          {editingMessage ? "Save" : "Send"}
        </Button>
      </form>
    </div>
  );
}
