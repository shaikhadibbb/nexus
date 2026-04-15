// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION TYPE DEFINITIONS
// Types for direct messaging and conversations
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity } from './common';
import { UserReference } from './user';
import { MediaAsset } from './media';

/**
 * Conversation (DM thread)
 */
export interface Conversation extends BaseEntity {
  // Participants
  participantIds: string[];
  participants?: UserReference[];
  
  // Group chat fields
  isGroup: boolean;
  groupName: string | null;
  groupAvatarUrl: string | null;
  
  // Last message preview
  lastMessageId: string | null;
  lastMessage?: Message;
  lastMessageAt: Date | string | null;
  
  // Read state
  unreadCount: number;
  lastReadAt: Date | string | null;
  
  // Settings
  isMuted: boolean;
  mutedUntil: Date | string | null;
  isPinned: boolean;
  
  // Status
  isArchived: boolean;
}

/**
 * Direct message
 */
export interface Message extends BaseEntity {
  conversationId: string;
  senderId: string;
  sender?: UserReference;
  
  // Content
  content: string;
  contentHtml: string;
  
  // Media attachments
  media: MediaAsset[];
  
  // Reply to another message
  replyToId: string | null;
  replyTo?: Message;
  
  // Read receipts
  readBy: ReadReceipt[];
  
  // Status
  isEdited: boolean;
  editedAt: Date | string | null;
  deletedAt: Date | string | null;
  
  // Delivery status for sender
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Read receipt
 */
export interface ReadReceipt {
  userId: string;
  readAt: Date | string;
}

/**
 * Message reaction
 */
export interface MessageReaction extends BaseEntity {
  messageId: string;
  userId: string;
  user?: UserReference;
  emoji: string;
}

/**
 * Typing indicator state
 */
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  user?: UserReference;
  startedAt: Date | string;
}

/**
 * Create conversation input
 */
export interface CreateConversationInput {
  participantIds: string[];
  isGroup?: boolean;
  groupName?: string;
  initialMessage?: string;
}

/**
 * Send message input
 */
export interface SendMessageInput {
  conversationId: string;
  content: string;
  mediaIds?: string[];
  replyToId?: string;
}

/**
 * Conversation list item (optimized for list view)
 */
export interface ConversationListItem {
  id: string;
  participants: UserReference[];
  isGroup: boolean;
  groupName: string | null;
  groupAvatarUrl: string | null;
  lastMessage: {
    content: string;
    senderId: string;
    senderName: string;
    sentAt: Date | string;
  } | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
}
