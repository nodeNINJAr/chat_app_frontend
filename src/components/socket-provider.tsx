"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { withId } from "@/lib/normalize";
import { useRealtimeStore } from "@/lib/realtime-store";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { playMessageSound } from "@/lib/sounds";
import type { ChatMessage, ConversationSummary, GroupSummary } from "@/lib/types";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket(accessToken);
    const { setUserOnline, setUserOffline, setOnlineSnapshot, setTyping } =
      useRealtimeStore.getState();

    const onMessageNew = (raw: ChatMessage) => {
      const message = withId(raw);
      const isOwnMessage = message.senderId === useAuthStore.getState().user?.id;
      if (!isOwnMessage) {
        socket.emit("message:delivered", { messageId: message.id });
        const isViewingConversation =
          window.location.pathname === `/chat/${message.conversationId}`;
        if (!isViewingConversation) playMessageSound();
      }
      queryClient.setQueryData<ChatMessage[]>(
        ["messages", message.conversationId],
        (prev) => {
          if (!prev) return [message];
          if (message.clientTempId) {
            const withoutTemp = prev.filter(
              (m) => m.clientTempId !== message.clientTempId,
            );
            return [...withoutTemp, message];
          }
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        },
      );
      queryClient.setQueryData<ConversationSummary[]>(["conversations"], (prev) => {
        if (!prev) return prev;
        if (!prev.some((c) => c.id === message.conversationId)) {
          // Brand-new conversation (its first message ever) — nothing here to
          // patch yet, so refetch the list instead of silently dropping it.
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
          return prev;
        }
        return prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: {
                  messageId: message.id,
                  senderId: message.senderId,
                  type: message.type,
                  preview: message.content.text ?? message.type,
                  createdAt: message.createdAt,
                },
                lastMessageAt: message.createdAt,
                unreadCount:
                  message.senderId === useAuthStore.getState().user?.id
                    ? c.unreadCount
                    : c.unreadCount + 1,
              }
            : c,
        );
      });
    };

    const onMessageEdited = (raw: ChatMessage) => {
      const message = withId(raw);
      queryClient.setQueryData<ChatMessage[]>(
        ["messages", message.conversationId],
        (prev) => prev?.map((m) => (m.id === message.id ? message : m)),
      );
    };

    const onMessageDeleted = ({
      messageId,
      conversationId,
      mode,
    }: {
      messageId: string;
      conversationId: string;
      mode: "me" | "everyone";
    }) => {
      queryClient.setQueryData<ChatMessage[]>(["messages", conversationId], (prev) => {
        if (mode === "me") return prev?.filter((m) => m.id !== messageId);
        return prev?.map((m) =>
          m.id === messageId ? { ...m, isDeletedForEveryone: true } : m,
        );
      });
    };

    const onReactionUpdated = ({
      messageId,
      conversationId,
      reactions,
    }: {
      messageId: string;
      conversationId: string;
      reactions: ChatMessage["reactions"];
    }) => {
      queryClient.setQueryData<ChatMessage[]>(["messages", conversationId], (prev) =>
        prev?.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      );
    };

    const onPresenceOnline = ({ userId }: { userId: string }) => setUserOnline(userId);
    const onPresenceOffline = ({ userId }: { userId: string }) =>
      setUserOffline(userId);
    const onPresenceSnapshot = ({ onlineUserIds }: { onlineUserIds: string[] }) =>
      setOnlineSnapshot(onlineUserIds);

    const onTypingStart = ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => setTyping(conversationId, userId, true);

    const onTypingStop = ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => setTyping(conversationId, userId, false);

    const onGroupMembersChanged = ({ groupId }: { groupId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    };

    const onGroupSettingsUpdated = (payload: {
      groupId: string;
      name: string;
      description: string | null;
      avatarUrl: string | null;
      settings: GroupSummary["settings"];
    }) => {
      queryClient.setQueryData<GroupSummary>(["group", payload.groupId], (prev) =>
        prev
          ? {
              ...prev,
              name: payload.name,
              description: payload.description,
              avatarUrl: payload.avatarUrl,
              settings: payload.settings,
            }
          : prev,
      );
    };

    socket.on("message:new", onMessageNew);
    socket.on("message:edited", onMessageEdited);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:reaction-updated", onReactionUpdated);
    socket.on("presence:online", onPresenceOnline);
    socket.on("presence:offline", onPresenceOffline);
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("group:member-added", onGroupMembersChanged);
    socket.on("group:member-removed", onGroupMembersChanged);
    socket.on("group:role-updated", onGroupMembersChanged);
    socket.on("group:settings-updated", onGroupSettingsUpdated);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:edited", onMessageEdited);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:reaction-updated", onReactionUpdated);
      socket.off("presence:online", onPresenceOnline);
      socket.off("presence:offline", onPresenceOffline);
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("group:member-added", onGroupMembersChanged);
      socket.off("group:member-removed", onGroupMembersChanged);
      socket.off("group:role-updated", onGroupMembersChanged);
      socket.off("group:settings-updated", onGroupSettingsUpdated);
    };
  }, [accessToken, queryClient]);

  return <>{children}</>;
}
