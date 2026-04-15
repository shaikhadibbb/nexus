// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPE DEFINITIONS
// Types for notification events, counts, and preferences
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity } from './common';
import { UserReference } from './user';
import { Post } from './post';

/**
 * Notification action types
 */
export type NotificationType =
  | 'like'              // Someone liked your post
  | 'repost'            // Someone reposted your post
  | 'quote'             // Someone quoted your post
  | 'reply'             // Someone replied to your post
  | 'mention'           // Someone mentioned you
  | 'follow'            // Someone followed you
  | 'follow_request'    // Someone requested to follow you
  | 'follow_accepted'   // Your follow request was accepted
  | 'tip_received'      // You received a tip
  | 'subscription_new'  // New subscriber
  | 'subscription_renewal' // Subscriber renewed
  | 'post_milestone'    // Your post hit a milestone (100 likes, etc.)
  | 'system';           // Platform announcements

/**
 * Core notification entity
 */
export interface Notification extends BaseEntity {
  recipientId: string;
  type: NotificationType;

  // Who triggered the notification
  actorId: string | null;
  actor?: UserReference | null;

  // Related entities
  postId: string | null;
  post?: Pick<Post, 'id' | 'content' | 'authorId'> | null;
  commentId: string | null;

  // Notification content
  title: string;
  body: string;
  imageUrl: string | null;

  // State
  isRead: boolean;
  readAt: Date | string | null;

  // Grouping (multiple actors for same action e.g. "3 people liked your post")
  groupKey: string | null;           // e.g. "like:post:abc123"
  groupActorCount: number;           // Total actors in group
  groupActors: UserReference[];      // Preview actors (up to 3)

  // Deep link
  actionUrl: string | null;
}

/**
 * Notification unread counts
 */
export interface NotificationCounts {
  total: number;
  likes: number;
  reposts: number;
  replies: number;
  follows: number;
  mentions: number;
  payments: number;
  system: number;
}

/**
 * Notification preferences per type
 */
export interface NotificationPreferences {
  likes: NotificationDelivery;
  reposts: NotificationDelivery;
  quotes: NotificationDelivery;
  replies: NotificationDelivery;
  mentions: NotificationDelivery;
  follows: NotificationDelivery;
  followRequests: NotificationDelivery;
  tips: NotificationDelivery;
  subscriptions: NotificationDelivery;
  system: NotificationDelivery;
}

/**
 * How a notification should be delivered
 */
export interface NotificationDelivery {
  inApp: boolean;
  push: boolean;
  email: boolean;
}

/**
 * Notification group (for UI rendering)
 * Groups multiple notification actors into a single notification item
 */
export interface NotificationGroup {
  groupKey: string;
  type: NotificationType;
  actors: UserReference[];
  totalActors: number;
  post?: Pick<Post, 'id' | 'content' | 'authorId'> | null;
  newestAt: Date | string;
  isRead: boolean;
  actionUrl: string | null;
}

/**
 * Input for creating a notification internally
 */
export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  actorId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
}
