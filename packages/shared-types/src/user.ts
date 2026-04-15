// ═══════════════════════════════════════════════════════════════════════════════
// USER TYPE DEFINITIONS
// Types for user accounts, profiles, and relationships
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity, GeoPoint, SoftDeletable } from './common';

/**
 * User account status
 */
export type UserStatus = 'active' | 'suspended' | 'deactivated' | 'pending_verification';

/**
 * User account type for feature gating
 */
export type AccountType = 'personal' | 'creator' | 'business' | 'verified';

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'github' | 'twitter' | 'apple';

/**
 * Core user entity
 */
export interface User extends BaseEntity, SoftDeletable {
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarBlurhash: string | null;
  coverUrl: string | null;
  coverBlurhash: string | null;
  status: UserStatus;
  accountType: AccountType;
  isVerified: boolean;
  emailVerified: boolean;
  
  // Profile fields
  website: string | null;
  location: string | null;
  coordinates: GeoPoint | null;
  birthDate: Date | string | null;
  
  // Privacy settings
  isPrivate: boolean;
  showOnlineStatus: boolean;
  allowDMs: 'everyone' | 'followers' | 'none';
  
  // Reputation & metrics (denormalized for performance)
  reputationScore: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
  
  // Preferences
  theme: 'light' | 'dark' | 'system';
  locale: string;
  timezone: string;
  
  // Wellbeing settings
  focusModeEnabled: boolean;
  scrollVelocityLimit: number | null; // null = disabled
  contentWarningsEnabled: boolean;
}

/**
 * Public user profile (safe for API responses)
 */
export type PublicUser = Omit<User, 
  | 'email' 
  | 'emailVerified' 
  | 'birthDate' 
  | 'deletedAt'
  | 'allowDMs'
  | 'focusModeEnabled'
  | 'scrollVelocityLimit'
  | 'contentWarningsEnabled'
>;

/**
 * Minimal user reference for embedding in other entities
 */
export interface UserReference {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarBlurhash: string | null;
  isVerified: boolean;
  accountType: AccountType;
}

/**
 * User session data stored in JWT
 */
export interface UserSession {
  userId: string;
  sessionId: string;
  username: string;
  email: string;
  accountType: AccountType;
  isVerified: boolean;
}

/**
 * User registration input
 */
export interface CreateUserInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

/**
 * User profile update input
 */
export interface UpdateUserInput {
  displayName?: string;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  birthDate?: Date | string | null;
  isPrivate?: boolean;
  showOnlineStatus?: boolean;
  allowDMs?: 'everyone' | 'followers' | 'none';
  theme?: 'light' | 'dark' | 'system';
  locale?: string;
  timezone?: string;
  focusModeEnabled?: boolean;
  scrollVelocityLimit?: number | null;
  contentWarningsEnabled?: boolean;
}

/**
 * OAuth account link
 */
export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

/**
 * Follow relationship
 */
export interface Follow extends BaseEntity {
  followerId: string;
  followingId: string;
  follower?: UserReference;
  following?: UserReference;
  notificationsEnabled: boolean;
}

/**
 * Relationship status between two users
 */
export interface RelationshipStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isBlocked: boolean;
  isBlockedBy: boolean;
  isMuted: boolean;
  followRequestPending: boolean;
}

/**
 * Block relationship
 */
export interface Block extends BaseEntity {
  blockerId: string;
  blockedId: string;
  reason: string | null;
}

/**
 * Mute relationship (hides content without blocking)
 */
export interface Mute extends BaseEntity {
  muterId: string;
  mutedId: string;
  expiresAt: Date | string | null; // null = permanent
  muteReposts: boolean;
  muteNotifications: boolean;
}

/**
 * User reputation event for scoring
 */
export interface ReputationEvent {
  id: string;
  userId: string;
  eventType: ReputationEventType;
  delta: number;
  sourceId: string | null;
  createdAt: Date | string;
}

export type ReputationEventType =
  | 'post_liked'
  | 'post_reposted'
  | 'post_replied'
  | 'gained_follower'
  | 'lost_follower'
  | 'content_moderated'
  | 'report_upheld'
  | 'tip_received'
  | 'subscription_gained';

/**
 * Creator subscription tier
 */
export interface SubscriptionTier extends BaseEntity {
  creatorId: string;
  name: string;
  description: string;
  priceMonthly: number; // In cents
  priceYearly: number | null;
  benefits: string[];
  subscriberCount: number;
  isActive: boolean;
}

/**
 * User subscription to a creator
 */
export interface Subscription extends BaseEntity {
  subscriberId: string;
  creatorId: string;
  tierId: string;
  tier?: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'paused';
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}
