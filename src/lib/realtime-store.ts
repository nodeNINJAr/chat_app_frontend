import { create } from "zustand";

interface RealtimeState {
  onlineUserIds: Set<string>;
  typingByConversation: Record<string, Set<string>>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setOnlineSnapshot: (userIds: string[]) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  onlineUserIds: new Set(),
  typingByConversation: {},
  setUserOnline: (userId) =>
    set((state) => ({ onlineUserIds: new Set(state.onlineUserIds).add(userId) })),
  // Seeds peers that were already online before this socket connected —
  // incremental presence:online events only reach sockets connected at the
  // moment they fire, so without this a freshly (re)connected client would
  // never learn about peers who came online earlier.
  setOnlineSnapshot: (userIds) =>
    set((state) => ({ onlineUserIds: new Set([...state.onlineUserIds, ...userIds]) })),
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
