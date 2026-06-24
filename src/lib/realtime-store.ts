import { create } from "zustand";

interface RealtimeState {
  onlineUserIds: Set<string>;
  typingByConversation: Record<string, Set<string>>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  onlineUserIds: new Set(),
  typingByConversation: {},
  setUserOnline: (userId) =>
    set((state) => ({ onlineUserIds: new Set(state.onlineUserIds).add(userId) })),
  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),
  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = new Set(state.typingByConversation[conversationId]);
      if (isTyping) {
        current.add(userId);
      } else {
        current.delete(userId);
      }
      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: current,
        },
      };
    }),
}));
