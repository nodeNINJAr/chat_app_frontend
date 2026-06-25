"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Copy, Forward, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QUICK_REACTIONS, ReactionPicker } from "@/components/reaction-picker";
import { useAuthStore } from "@/lib/auth-store";
import { formatTimestamp } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageAttachment } from "@/components/message-attachment";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_THRESHOLD_PX = 10;

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

  // Press-and-hold opens a single WhatsApp-style sheet (reactions + actions)
  // anchored to the bubble — works alongside the always-visible icons below,
  // not instead of them.
  const bubbleRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  function clearPressTimer() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    pressOriginRef.current = { x: e.clientX, y: e.clientY };
    clearPressTimer();
    pressTimerRef.current = setTimeout(() => setActionSheetOpen(true), LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const origin = pressOriginRef.current;
    if (!origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) clearPressTimer();
  }

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
    <div
      className={cn(
        "group flex gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {!isOwn && actions}

      <div className="flex max-w-[70%] flex-col gap-1">
        <div
          ref={bubbleRef}
          onPointerDown={message.isDeletedForEveryone ? undefined : handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={clearPressTimer}
          onPointerCancel={clearPressTimer}
          onPointerLeave={clearPressTimer}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "rounded-2xl px-4 py-2 text-sm select-none",
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

        <PopoverPrimitive.Root open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
              anchor={bubbleRef}
              side="top"
              align={isOwn ? "end" : "start"}
              sideOffset={6}
              className="isolate z-50"
            >
              <PopoverPrimitive.Popup className="flex w-auto flex-col gap-1 rounded-lg bg-popover p-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                <div className="flex gap-1 border-b pb-1.5">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(message, emoji);
                        setActionSheetOpen(false);
                      }}
                      className="rounded-md p-1.5 text-lg hover:bg-accent"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {isText && !message.isDeletedForEveryone && (
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(text ?? "");
                      setActionSheetOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <Copy className="size-4" />
                    Copy
                  </button>
                )}
                <button
                  onClick={() => {
                    onReply(message);
                    setActionSheetOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                >
                  <Reply className="size-4" />
                  Reply
                </button>
                {!message.isDeletedForEveryone && (
                  <button
                    onClick={() => {
                      onForward(message);
                      setActionSheetOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <Forward className="size-4" />
                    Forward
                  </button>
                )}
                {isOwn && isText && !message.isDeletedForEveryone && (
                  <button
                    onClick={() => {
                      onEdit(message);
                      setActionSheetOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </button>
                )}
                {isOwn && !message.isDeletedForEveryone && (
                  <button
                    onClick={() => {
                      onDelete(message, "everyone");
                      setActionSheetOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-destructive hover:bg-accent"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                )}
              </PopoverPrimitive.Popup>
            </PopoverPrimitive.Positioner>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      {isOwn && actions}
    </div>
  );
}
