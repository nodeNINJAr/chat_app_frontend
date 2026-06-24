export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: "online" | "offline";
  lastSeenAt: string | null;
}

export type MessageType = "text" | "image" | "video" | "audio" | "file" | "system";

export interface MessageContent {
  text?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  durationSec?: number | null;
}

export interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: MessageContent;
  replyToMessageId?: string | null;
  forwardedFrom?: string | null;
  reactions: Reaction[];
  mentions: string[];
  deletedForUserIds: string[];
  isDeletedForEveryone: boolean;
  editedAt?: string | null;
  createdAt: string;
  clientTempId?: string;
}

export interface ConversationSummary {
  id: string;
  type: "direct" | "group";
  groupId: string | null;
  lastMessage: {
    messageId: string;
    senderId: string;
    type: MessageType;
    preview: string;
    createdAt: string;
  } | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  isPinned: boolean;
  role: string;
  otherParticipantIds: string[];
}

export type GroupRole = "owner" | "admin" | "member";

export interface GroupSettings {
  whoCanSendMessages: "everyone" | "admins";
  whoCanAddMembers: "everyone" | "admins";
}

export interface GroupSummary {
  id: string;
  conversationId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  memberCount: number;
  settings: GroupSettings;
}

export interface GroupMember {
  userId: string;
  conversationId: string;
  role: GroupRole;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  isPinned: boolean;
  leftAt: string | null;
}

export type CallType = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "active"
  | "completed"
  | "missed"
  | "rejected"
  | "cancelled";

export interface CallRecord {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
}

export interface TurnCredentials {
  username: string;
  password: string;
  ttlSeconds: number;
  urls: string[];
}

export interface BlockedUser {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface UploadTarget {
  key: string;
  uploadMethod: string;
  uploadUrl: string;
  expiresIn: number;
}

export type UploadKind = "image" | "video" | "audio" | "document";
