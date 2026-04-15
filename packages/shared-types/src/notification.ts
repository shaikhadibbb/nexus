// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPE DEFINITIONS
// Types for the notification system
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity } from './common';
import { UserReference } from './user';
import { Post } from './post';

/**
 * Notification types
 */
export type NotificationType =
  | 'like'
  | 'repost'
  | 'quote'
  | 'reply'
  | 'mention'
  | 'follow'
  | 'follow_request'
  | 'follow_request_accepted'
  | 'subscription'
  | 'tip'
  | 'poll_ended'
  | 'thread_reply'
  | 'milestone'
  | 'system';

/**
 * Core notification entity
 */
export interface Notification extends BaseEntity {
  recipientId: string;
  type: NotificationType;
  
  // Actor(s) who triggered the notification
  actorId: string | null;
  actor?: UserReference;
  
  // For grouped notifications (multiple likes, etc.)
  actorIds: string[];
  actors?: UserReference[];
  actorCount: number;
  
  // Related entities
  postId: string | null;
  post?: Post;
  
  // Notification content
  title: string;
  body: string;
  
  // Status
  isRead: boolean;
  readAt: Date | string | null;
  
  // Grouping key for collapsing similar notifications
  groupKey: string | null;
  
  // Deep link
  actionUrl: string;
}

/**
 * Notification creation input (internal)
 */
export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  actorId?: string;
  postId?: string;
  data?: Record<string, unknown>;
}

/**
 * Notification preferences per type
 */
export interface NotificationPreferences {
  userId: string;
  
  // Per-type settings
  likes: NotificationChannels;
  reposts: NotificationChannels;
  quotes: NotificationChannels;
  replies: NotificationChannels;
  mentions: NotificationChannels;
  follows: NotificationChannels;
  subscriptions: NotificationChannels;
  tips: NotificationChannels;
  milestones: NotificationChannels;
  system: NotificationChannels;
  
  // Global settings
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never';
  quietHoursStart: string | null; // HH:mm format
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
}

/**
 * Notification delivery channels
 */
export interface NotificationChannels {
  inApp: boolean;
  push: boolean;
  email: boolean;
}

/**
 * Notification count response
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Partial<Record<NotificationType, number>>;
}

/**
 * Push notification registration
 */
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date | string;
  lastUsedAt: Date | string;
}
