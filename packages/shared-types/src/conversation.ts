// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION TYPE DEFINITIONS
// Types for direct messages, group chats, and messaging
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity, SoftDeletable } from './common';
import { UserReference } from './user';
import { MediaAsset } from './media';

/**
 * Conversation types
 */
export type ConversationType = 'direct' | 'group';

/**
 * Message content types
 */
export type MessageContentType = 'text' | 'media' | 'post_share' | 'system';

/**
 * Conversation entity
 */
export interface Conversation extends BaseEntity {
  type: ConversationType;
  name: string | null;           // For group conversations
  avatarUrl: string | null;      // For group conversations
  creatorId: string | null;      // For group conversations

  // Members
  members: ConversationMember[];
  memberCount: number;

  // Latest message preview
  lastMessage: MessagePreview | null;

  // Request/acceptance model for DMs
  isAccepted: boolean;
  isRequestHidden: boolean;

  // Muted state for current user (populated per-user)
  isMuted?: boolean;
  mutedUntil?: Date | string | null;
}

/**
 * Lightweight conversation for list views
 */
export interface ConversationListItem {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;

  // Other participants (for display in list)
  otherMembers: UserReference[];

  // Last message
  lastMessage: MessagePreview | null;

  // State
  unreadCount: number;
  isMuted: boolean;

  updatedAt: Date | string;
}

/**
 * Conversation member
 */
export interface ConversationMember {
  userId: string;
  user?: UserReference;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date | string;

  // Per-member state
  lastReadAt: Date | string | null;
  lastReadMessageId: string | null;
  isMuted: boolean;
  mutedUntil: Date | string | null;
  isHidden: boolean;
}

/**
 * Full message entity
 */
export interface Message extends BaseEntity, SoftDeletable {
  conversationId: string;
  senderId: string;
  sender?: UserReference;

  contentType: MessageContentType;
  content: string;

  // Media attachments
  media: MediaAsset[];

  // Reply context
  replyToId: string | null;
  replyTo?: MessagePreview | null;

  // Reactions
  reactions: MessageReaction[];

  // Edit history
  isEdited: boolean;
  editedAt: Date | string | null;

  // Read receipts
  readBy: MessageReadReceipt[];

  // Delivery status (for current sender)
  deliveryStatus?: 'sent' | 'delivered' | 'read';
}

/**
 * Minimal message preview for conversation list
 */
export interface MessagePreview {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  contentType: MessageContentType;
  hasMedia: boolean;
  createdAt: Date | string;
}

/**
 * Message reaction
 */
export interface MessageReaction {
  emoji: string;
  count: number;
  reactor?: UserReference;
  reactorIds: string[];
  hasReacted?: boolean; // Current user
}

/**
 * Read receipt for a message
 */
export interface MessageReadReceipt {
  userId: string;
  user?: UserReference;
  readAt: Date | string;
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  startedAt: Date | string;
}

/**
 * Input for sending a message
 */
export interface SendMessageInput {
  content: string;
  mediaIds?: string[];
  replyToId?: string;
}

/**
 * Input for creating a conversation
 */
export interface CreateConversationInput {
  participantIds: string[];
  isGroup?: boolean;
  groupName?: string;
  initialMessage?: string;
}
