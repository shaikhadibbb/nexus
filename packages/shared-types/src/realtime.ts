// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME TYPE DEFINITIONS
// Types for WebSocket events and presence
// ═══════════════════════════════════════════════════════════════════════════════

import { UserReference } from './user';
import { Post } from './post';
import { Message, TypingIndicator } from './conversation';
import { Notification } from './notification';

/**
 * WebSocket event types (client -> server)
 */
export type ClientEventType =
  | 'authenticate'
  | 'subscribe'
  | 'unsubscribe'
  | 'typing_start'
  | 'typing_stop'
  | 'presence_update'
  | 'cursor_move'
  | 'reading_post';

/**
 * WebSocket event types (server -> client)
 */
export type ServerEventType =
  | 'authenticated'
  | 'error'
  | 'notification'
  | 'new_post'
  | 'post_updated'
  | 'post_deleted'
  | 'new_message'
  | 'message_updated'
  | 'message_deleted'
  | 'message_read'
  | 'typing'
  | 'presence'
  | 'post_engagement'
  | 'cursor_positions'
  | 'readers';

/**
 * Channel types for pub/sub
 */
export type ChannelType =
  | 'user'           // Personal events (notifications, DMs)
  | 'post'           // Post-specific events (engagement updates)
  | 'conversation'   // DM conversation events
  | 'feed'           // Feed updates
  | 'presence';      // Online status

/**
 * Generic WebSocket message wrapper
 */
export interface WebSocketMessage<T = unknown> {
  type: ClientEventType | ServerEventType;
  channel?: string;
  payload: T;
  timestamp: Date | string;
}

/**
 * Authentication payload
 */
export interface AuthenticatePayload {
  token: string;
}

/**
 * Channel subscription payload
 */
export interface SubscribePayload {
  channel: string;
  channelType: ChannelType;
}

/**
 * Presence update payload
 */
export interface PresencePayload {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeenAt: Date | string;
}

/**
 * Typing indicator payload
 */
export interface TypingPayload {
  conversationId: string;
  users: TypingIndicator[];
}

/**
 * Post engagement update (live like counts, etc.)
 */
export interface PostEngagementPayload {
  postId: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  viewCount: number;
  momentumScore: number;
}

/**
 * New post event payload
 */
export interface NewPostPayload {
  post: Post;
  feedTypes: string[]; // Which feeds should show this
}

/**
 * Cursor position for collaborative features
 */
export interface CursorPosition {
  userId: string;
  user: UserReference;
  postId: string;
  position: {
    x: number;
    y: number;
  };
}

/**
 * "Currently reading" indicator
 */
export interface ReadingIndicator {
  postId: string;
  readers: UserReference[];
  readerCount: number;
}

/**
 * New message event payload
 */
export interface NewMessagePayload {
  message: Message;
  conversationId: string;
}

/**
 * Message read receipt event
 */
export interface MessageReadPayload {
  conversationId: string;
  messageId: string;
  readBy: {
    userId: string;
    readAt: Date | string;
  };
}

/**
 * Connection state
 */
export type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'reconnecting'
  | 'disconnected'
  | 'error';
