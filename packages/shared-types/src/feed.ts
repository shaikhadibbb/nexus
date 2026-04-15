// ═══════════════════════════════════════════════════════════════════════════════
// FEED TYPE DEFINITIONS
// Types for feed algorithms and content delivery
// ═══════════════════════════════════════════════════════════════════════════════

import { Post } from './post';
import { UserReference } from './user';
import { CursorPaginationMeta } from './common';

/**
 * Feed types available to users
 */
export type FeedType = 
  | 'home'           // Personalized algorithmic feed
  | 'following'      // Chronological from followed users
  | 'trending'       // High momentum content
  | 'explore'        // Discovery feed
  | 'local'          // Geographic-based
  | 'list'           // Custom user list
  | 'hashtag'        // Hashtag-filtered
  | 'user';          // Single user's posts

/**
 * Feed item wrapping a post with feed-specific metadata
 */
export interface FeedItem {
  id: string; // Unique feed item ID (different from post ID for deduplication)
  post: Post;
  feedType: FeedType;
  
  // Why this item appears in the feed
  reason: FeedItemReason;
  reasonContext?: FeedItemReasonContext;
  
  // Engagement prediction for UI hints
  engagementPrediction: number;
  
  // Position scoring for ranking
  score: number;
  
  // Deduplication tracking
  seenAt: Date | string | null;
  
  // Thread preview (for long threads)
  threadPreview?: Post[];
  
  // Context collapse grouping
  threadGroupId?: string;
  isThreadHead?: boolean;
}

/**
 * Why a post appears in the feed
 */
export type FeedItemReason =
  | 'following'           // From someone you follow
  | 'liked_by_following'  // Liked by someone you follow
  | 'trending'            // High momentum
  | 'trending_in_network' // Trending among your network
  | 'similar_to_liked'    // Similar to content you've engaged with
  | 'popular_in_location' // Popular nearby
  | 'from_list'           // From a custom list
  | 'hashtag'             // Matches followed hashtag
  | 'promoted';           // Paid promotion

/**
 * Additional context for feed item reason
 */
export interface FeedItemReasonContext {
  // For 'liked_by_following'
  likedBy?: UserReference[];
  likedByCount?: number;
  
  // For 'from_list'
  listId?: string;
  listName?: string;
  
  // For 'trending_in_network'
  networkEngagementCount?: number;
}

/**
 * Feed response
 */
export interface FeedResponse {
  items: FeedItem[];
  pagination: CursorPaginationMeta;
  feedType: FeedType;
  
  // Feed health metrics
  freshness: number; // 0-1, how fresh the content is
  diversity: number; // 0-1, how diverse the content is
}

/**
 * Feed request parameters
 */
export interface FeedParams {
  feedType: FeedType;
  cursor?: string;
  limit?: number;
  
  // For list/hashtag feeds
  listId?: string;
  hashtag?: string;
  userId?: string;
  
  // Filters
  includeReplies?: boolean;
  includeReposts?: boolean;
  mediaOnly?: boolean;
  
  // Location for local feeds
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/**
 * Momentum score calculation inputs
 * Used by the algorithmic feed to rank content
 */
export interface MomentumCalculation {
  postId: string;
  
  // Raw engagement counts
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  views: number;
  
  // Time-weighted calculations
  ageHours: number;
  engagementRate: number; // Engagements per view
  velocityPerHour: number; // Change in engagement rate
  acceleration: number; // Change in velocity
  
  // Author factors
  authorFollowerCount: number;
  authorReputationScore: number;
  
  // Final scores
  momentumScore: number;
  finalRankScore: number;
}

/**
 * Trending hashtag
 */
export interface TrendingHashtag {
  tag: string;
  postCount: number;
  postCountChange: number; // vs previous period
  velocity: number;
  topPosts: Post[];
  participantCount: number;
}

/**
 * Trending topics response
 */
export interface TrendingTopicsResponse {
  hashtags: TrendingHashtag[];
  timeWindow: 'hour' | 'day' | 'week';
  location?: string; // Geographic filter if applied
}

/**
 * User list for custom feeds
 */
export interface UserList {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  members?: UserReference[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
