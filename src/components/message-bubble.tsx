"use client";

import { Forward, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactionPicker } from "@/components/reaction-picker";
import { useAuthStore } from "@/lib/auth-store";
import { formatTimestamp } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageAttachment } from "@/components/message-attachment";

function groupReactions(reactions: ChatMessage["reactions"]) {
  const byEmoji = new Map<string, string[]>();
  for (const r of reactions) {
    const list = byEmoji.get(r.emoji) ?? [];
    list.push(r.userId);
    byEmoji.set(r.emoji, list);
  }
  return [...byEmoji.entries()].map(([emoji, userIds]) => ({ emoji, userIds }));
}

export function MessageBubble({
  message,
  isOwn,
  replyPreview,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
}: {
  message: ChatMessage;
  isOwn: boolean;
  replyPreview?: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage, mode: "me" | "everyone") => void;
  onForward: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isPending = message.id.startsWith("temp-");
  const isText = message.type === "text";
  const text = message.isDeletedForEveryone
    ? "This message was deleted"
    : message.content.text;
  const reactionGroups = groupReactions(message.reactions);

  // Compact and always rendered (no hover-only visibility) so actions are
  // reachable by tap on touch devices, not just mouse hover. Kept small (two
  // buttons) so it doesn't meaningfully shift the bubble's own alignment.
  const actions = (
    <div className="flex items-end gap-1">
      <ReactionPicker onSelect={(emoji) => onReact(message, emoji)} />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwn ? "end" : "start"}>
          <DropdownMenuItem onClick={() => onReply(message)}>
            <Reply className="size-4" />
            Reply
          </DropdownMenuItem>
          {!message.isDeletedForEveryone && (
            <DropdownMenuItem onClick={() => onForward(message)}>
              <Forward className="size-4" />
              Forward
            </DropdownMenuItem>
          )}
          {isOwn && isText && !message.isDeletedForEveryone && (
            <DropdownMenuItem onClick={() => onEdit(message)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
          )}
          {isOwn && !message.isDeletedForEveryone && (
            <DropdownMenuItem onClick={() => onDelete(message, "everyone")}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className={cn("group flex gap-1", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && actions}

      <div className="flex max-w-[70%] flex-col gap-1">
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm",
            isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            message.isDeletedForEveryone && "italic opacity-60",
            isPending && "opacity-60",
          )}
        >
          {replyPreview && !message.isDeletedForEveryone && (
            <div
              className={cn(
                "mb-1.5 rounded border-l-2 px-2 py-1 text-xs opacity-80",
                isOwn ? "border-primary-foreground/40" : "border-foreground/30",
              )}
            >
              <p className="truncate">
                {replyPreview.content.text ?? `[${replyPreview.type}]`}
              </p>
            </div>
          )}
          {!message.isDeletedForEveryone && !isText && (
            <MessageAttachment message={message} />
          )}
          {text && <p className="whitespace-pre-wrap wrap-break-word">{text}</p>}
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-[11px] opacity-70",
              isOwn ? "justify-end" : "justify-start",
            )}
          >
            {message.editedAt && <span>edited</span>}
            <span>{formatTimestamp(message.createdAt)}</span>
          </div>
        </div>

        {reactionGroups.length > 0 && (
          <div className={cn("flex flex-wrap gap-1", isOwn && "justify-end")}>
            {reactionGroups.map(({ emoji, userIds }) => (
              <button
                key={emoji}
                onClick={() => onReact(message, emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                  currentUserId && userIds.includes(currentUserId)
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background",
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isOwn && actions}
    </div>
  );
}
