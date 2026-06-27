import { apiClient } from "./api-client";
import { withId } from "./normalize";
import type {
  AuthUser,
  BlockedUser,
  CallRecord,
  ChatMessage,
  ConversationSummary,
  GroupMember,
  GroupSettings,
  GroupSummary,
  TurnCredentials,
  UploadKind,
  UploadTarget,
  UserProfile,
} from "./types";

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export function register(input: {
  username: string;
  password: string;
  displayName: string;
  email?: string;
}) {
  return apiClient
    .post<AuthResponse>("/auth/register", input)
    .then((r) => r.data);
}

export function login(input: { identifier: string; password: string }) {
  return apiClient.post<AuthResponse>("/auth/login", input).then((r) => r.data);
}

export function logout() {
  return apiClient.post("/auth/logout").then((r) => r.data);
}

export function getMe() {
  return apiClient.get<UserProfile>("/users/me").then((r) => r.data);
}

export function searchUsers(query: string) {
  return apiClient
    .get<UserProfile[]>("/users/search", { params: { q: query } })
    .then((r) => r.data);
}

export function getUser(id: string) {
  return apiClient.get<UserProfile>(`/users/${id}`).then((r) => r.data);
}

export function getConversations() {
  return apiClient
    .get<ConversationSummary[]>("/conversations")
    .then((r) => r.data.map(withId));
}

export function createDirectConversation(userId: string) {
  return apiClient
    .post<ConversationSummary>("/conversations/direct", { userId })
    .then((r) => withId(r.data));
}

// Hides the conversation from this user's own list only — other
// participants, group membership, and message history are unaffected. It
// reappears automatically if a new message arrives.
export function deleteConversationForMe(conversationId: string) {
  return apiClient
    .patch(`/conversations/${conversationId}/state`, { isDeletedForUser: true })
    .then((r) => r.data);
}

// Backend returns newest-first (cursor pagination). Reversed here so callers
// can render top-to-bottom and append new realtime messages at the end.
export function getMessages(conversationId: string, before?: string) {
  return apiClient
    .get<ChatMessage[]>(`/conversations/${conversationId}/messages`, {
      params: before ? { before, limit: 50 } : { limit: 50 },
    })
    .then((r) => r.data.map(withId).reverse());
}

export function searchMessages(conversationId: string, query: string) {
  return apiClient
    .get<ChatMessage[]>(`/conversations/${conversationId}/messages/search`, {
      params: { q: query },
    })
    .then((r) => r.data.map(withId));
}

export function updateProfile(input: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}) {
  return apiClient.patch<UserProfile>("/users/me", input).then((r) => r.data);
}

export function listBlockedUsers() {
  return apiClient.get<BlockedUser[]>("/users/blocked").then((r) => r.data);
}

export function blockUser(userId: string) {
  return apiClient.post(`/users/${userId}/block`).then((r) => r.data);
}

export function unblockUser(userId: string) {
  return apiClient.delete(`/users/${userId}/block`).then((r) => r.data);
}

export function createGroup(input: { name: string; memberIds: string[] }) {
  return apiClient
    .post<GroupSummary>("/groups", input)
    .then((r) => withId(r.data));
}

export function getGroup(groupId: string) {
  return apiClient
    .get<GroupSummary>(`/groups/${groupId}`)
    .then((r) => withId(r.data));
}

export function listGroupMembers(groupId: string) {
  return apiClient
    .get<GroupMember[]>(`/groups/${groupId}/members`)
    .then((r) => r.data);
}

export function addGroupMembers(groupId: string, memberIds: string[]) {
  return apiClient
    .post<{ memberCount: number; addedUserIds: string[] }>(
      `/groups/${groupId}/members`,
      { memberIds },
    )
    .then((r) => r.data);
}

export function removeGroupMember(groupId: string, userId: string) {
  return apiClient
    .delete<{ memberCount: number }>(`/groups/${groupId}/members/${userId}`)
    .then((r) => r.data);
}

export function updateGroupRole(
  groupId: string,
  userId: string,
  role: "admin" | "member",
) {
  return apiClient
    .patch<{ userId: string; role: string }>(
      `/groups/${groupId}/members/${userId}/role`,
      { role },
    )
    .then((r) => r.data);
}

export function updateGroupSettings(
  groupId: string,
  input: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    settings?: Partial<GroupSettings>;
  },
) {
  return apiClient
    .patch<GroupSummary>(`/groups/${groupId}`, input)
    .then((r) => withId(r.data));
}

export function getCallHistory() {
  return apiClient.get<CallRecord[]>("/calls/history").then((r) => r.data.map(withId));
}

export function getTurnCredentials() {
  return apiClient
    .get<TurnCredentials>("/calls/turn-credentials")
    .then((r) => r.data);
}

export function requestUploadUrl(input: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  // "avatar" isn't part of the chat-message UploadKind union since it's
  // never sent as a message — it's its own upload kind on the backend.
  kind: UploadKind | "avatar";
}) {
  return apiClient
    .post<UploadTarget>("/uploads/presign", input)
    .then((r) => r.data);
}

export function getAvatarPublicUrl(key: string) {
  return apiClient
    .get<{ url: string }>("/uploads/public-url", { params: { key } })
    .then((r) => r.data.url);
}

export function getDownloadUrl(key: string) {
  return apiClient
    .get<{ url: string; expiresIn: number }>("/uploads/download-url", {
      params: { key },
    })
    .then((r) => r.data.url);
}
