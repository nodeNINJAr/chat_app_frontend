"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatHeader } from "@/components/chat-header";
import { ChatSkeleton } from "@/components/chat-skeleton";
import { ConversationInfoDialog } from "@/components/conversation-info-dialog";
import { ForwardDialog } from "@/components/forward-dialog";
import { MessageBubble } from "@/components/message-bubble";
import { MessageComposer } from "@/components/message-composer";
import { MessageSearchDialog } from "@/components/message-search-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTypingEmitter } from "@/hooks/use-typing-emitter";
import { getConversations, getMessages } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCallStore } from "@/lib/call-store";
import { useRealtimeStore } from "@/lib/realtime-store";
import { getSocket } from "@/lib/socket";
import type { ChatMessage } from "@/lib/types";
import { messageTypeFromKind, uploadFile } from "@/lib/upload";

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  // Remounting on conversationId change resets all local state (draft, reply,
  // edit target) for free instead of needing a setState-in-effect reset.
  return <ConversationView key={conversationId} conversationId={conversationId} />;
}

function ConversationView({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { notifyTyping, stop: stopTyping } = useTypingEmitter(conversationId);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [noMoreHistory, setNoMoreHistory] = useState(false);
  const startCall = useCallStore((s) => s.startCall);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });
  const conversation = conversations?.find((c) => c.id === conversationId);
  const typingUserIds = useRealtimeStore(
    (s) => s.typingByConversation[conversationId],
  );

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
  });
  const messageById = new Map(messages?.map((m) => [m.id, m]));
  const lastMessageId = messages?.[messages.length - 1]?.id;

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
    // Deliberately keyed on the *last* message id, not array length — loading
    // older history prepends without changing the tail, so it must not jump
    // the scroll position back down to the bottom.
  }, [lastMessageId]);

  async function loadEarlierMessages() {
    if (!messages || messages.length === 0) return;
    setLoadingEarlier(true);
    try {
      const older = await getMessages(conversationId, messages[0].id);
      if (older.length === 0) {
        setNoMoreHistory(true);
      } else {
        queryClient.setQueryData<ChatMessage[]>(
          ["messages", conversationId],
          (prev) => [...older, ...(prev ?? [])],
        );
      }
    } finally {
      setLoadingEarlier(false);
    }
  }

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId === currentUser?.id) return;
    if (last.id.startsWith("temp-")) return;
    getSocket()?.emit("message:read", {
      conversationId,
      upToMessageId: last.id,
    });
  }, [messages, currentUser?.id, conversationId]);

  useEffect(() => stopTyping, [stopTyping]);

  function sendText() {
    const text = draft.trim();
    if (!text || !currentUser) return;

    if (editingMessage) {
      queryClient.setQueryData<ChatMessage[]>(
        ["messages", conversationId],
        (prev) =>
          prev?.map((m) =>
            m.id === editingMessage.id
              ? { ...m, content: { ...m.content, text }, editedAt: new Date().toISOString() }
              : m,
          ),
      );
      getSocket()?.emit("message:edit", { messageId: editingMessage.id, text });
      setEditingMessage(null);
      setDraft("");
      return;
    }

    const clientTempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: `temp-${clientTempId}`,
      conversationId,
      senderId: currentUser.id,
      type: "text",
      content: { text },
      replyToMessageId: replyTarget?.id ?? null,
      reactions: [],
      mentions: [],
      deletedForUserIds: [],
      isDeletedForEveryone: false,
      createdAt: new Date().toISOString(),
      clientTempId,
    };
    queryClient.setQueryData<ChatMessage[]>(
      ["messages", conversationId],
      (prev) => [...(prev ?? []), optimistic],
    );
    getSocket()?.emit("message:send", {
      conversationId,
      type: "text",
      content: { text },
      replyToMessageId: replyTarget?.id,
      clientTempId,
    });
    setDraft("");
    setReplyTarget(null);
    stopTyping();
  }

  async function handleUploadFile(file: File) {
    if (!currentUser) return;
    setUploading(true);
    try {
      const { key, kind } = await uploadFile(file);
      const type = messageTypeFromKind(kind);
      const clientTempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const content = {
        mediaUrl: key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      };
      const optimistic: ChatMessage = {
        id: `temp-${clientTempId}`,
        conversationId,
        senderId: currentUser.id,
        type,
        content,
        reactions: [],
        mentions: [],
        deletedForUserIds: [],
        isDeletedForEveryone: false,
        createdAt: new Date().toISOString(),
        clientTempId,
      };
      queryClient.setQueryData<ChatMessage[]>(
        ["messages", conversationId],
        (prev) => [...(prev ?? []), optimistic],
      );
      getSocket()?.emit("message:send", {
        conversationId,
        type,
        content,
        clientTempId,
      });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleReact(message: ChatMessage, emoji: string) {
    getSocket()?.emit("message:react", { messageId: message.id, emoji });
  }

  function handleDelete(message: ChatMessage, mode: "me" | "everyone") {
    getSocket()?.emit("message:delete", { messageId: message.id, mode });
  }

  function handleEdit(message: ChatMessage) {
    setEditingMessage(message);
    setReplyTarget(null);
    setDraft(message.content.text ?? "");
  }

  function handleReply(message: ChatMessage) {
    setReplyTarget(message);
    setEditingMessage(null);
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        conversation={conversation}
        typingUserIds={typingUserIds}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onStartCall={
          conversation?.type === "direct" && conversation.otherParticipantIds[0]
            ? (type) => startCall(conversation.otherParticipantIds[0], type)
            : undefined
        }
      />

      {/* min-h-0: flex items default to min-height:auto (their content's size),
          which would let this grow past the available space instead of
          scrolling internally and pushing the composer off-screen. */}
      <ScrollArea className="min-h-0 flex-1 p-4">
        <div className="flex flex-col gap-3">
          {isLoading && <ChatSkeleton />}
          {!isLoading && messages && messages.length > 0 && !noMoreHistory && (
            <Button
              variant="ghost"
              size="sm"
              className="mx-auto"
              disabled={loadingEarlier}
              onClick={loadEarlierMessages}
            >
              {loadingEarlier ? "Loading…" : "Load earlier messages"}
            </Button>
          )}
          {messages?.map((m) => (
            <div key={m.id} data-message-id={m.id}>
              <MessageBubble
                message={m}
                isOwn={m.senderId === currentUser?.id}
                replyPreview={
                  m.replyToMessageId ? messageById.get(m.replyToMessageId) : undefined
                }
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onForward={setForwardTarget}
                onReact={handleReact}
              />
            </div>
          ))}
          <div ref={scrollAnchorRef} />
        </div>
      </ScrollArea>

      <MessageComposer
        draft={draft}
        onDraftChange={(value) => {
          setDraft(value);
          if (value) notifyTyping();
          else stopTyping();
        }}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => {
          setEditingMessage(null);
          setDraft("");
        }}
        onSubmit={sendText}
        onUploadFile={handleUploadFile}
        uploading={uploading}
      />

      <ConversationInfoDialog
        conversation={conversation}
        open={infoOpen}
        onOpenChange={setInfoOpen}
      />
      <ForwardDialog message={forwardTarget} onOpenChange={() => setForwardTarget(null)} />
      <MessageSearchDialog
        conversationId={conversationId}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        loadedMessageIds={new Set(messages?.map((m) => m.id))}
      />
    </div>
  );
}
