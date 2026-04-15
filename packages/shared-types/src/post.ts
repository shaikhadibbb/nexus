// ═══════════════════════════════════════════════════════════════════════════════
// POST TYPE DEFINITIONS
// Types for posts, threads, and content interactions
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity, SoftDeletable, GeoPoint } from './common';
import { UserReference } from './user';
import { MediaAsset } from './media';

/**
 * Post visibility levels
 */
export type PostVisibility = 'public' | 'followers' | 'subscribers' | 'mentioned' | 'private';

/**
 * Post type for rendering and behavior
 */
export type PostType = 'text' | 'media' | 'poll' | 'thread' | 'quote' | 'repost';

/**
 * Content moderation status
 */
export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed' | 'appealed';

/**
 * Core post entity
 */
export interface Post extends BaseEntity, SoftDeletable {
  authorId: string;
  author?: UserReference;
  
  // Content
  content: string;
  contentHtml: string; // Pre-rendered HTML with links/mentions
  postType: PostType;
  visibility: PostVisibility;
  
  // Thread structure
  parentId: string | null; // Reply parent
  rootId: string | null; // Thread root (for deep replies)
  threadPath: string; // Materialized path for efficient tree queries
  replyCount: number;
  
  // Quote/Repost
  quotedPostId: string | null;
  quotedPost?: Post | null;
  repostOfId: string | null;
  repostOf?: Post | null;
  
  // Media
  media: MediaAsset[];
  
  // Poll (if postType === 'poll')
  poll: Poll | null;
  
  // Engagement metrics (denormalized)
  likeCount: number;
  repostCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  
  // Momentum scoring for feed algorithm
  momentumScore: number;
  momentumVelocity: number; // Change rate
  momentumUpdatedAt: Date | string;
  
  // Context & metadata
  location: GeoPoint | null;
  locationName: string | null;
  language: string | null;
  
  // Moderation
  moderationStatus: ModerationStatus;
  moderationNote: string | null;
  sensitiveContent: boolean;
  contentWarning: string | null;
  
  // Interaction flags (for current user context)
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  
  // Subscriber-only content
  subscriberOnly: boolean;
  requiredTierId: string | null;
  
  // Edit history
  isEdited: boolean;
  editedAt: Date | string | null;
}

/**
 * Poll attached to a post
 */
export interface Poll {
  id: string;
  postId: string;
  options: PollOption[];
  expiresAt: Date | string;
  isExpired: boolean;
  totalVotes: number;
  allowMultiple: boolean;
  hideResultsUntilEnd: boolean;
  userVotedOptionIds?: string[]; // Current user's votes
}

/**
 * Individual poll option
 */
export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  voteCount: number;
  percentage: number;
  order: number;
}

/**
 * Post like interaction
 */
export interface PostLike extends BaseEntity {
  postId: string;
  userId: string;
  user?: UserReference;
}

/**
 * Post bookmark
 */
export interface Bookmark extends BaseEntity {
  postId: string;
  userId: string;
  post?: Post;
  collectionId: string | null;
}

/**
 * Bookmark collection for organization
 */
export interface BookmarkCollection extends BaseEntity {
  userId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  bookmarkCount: number;
}

/**
 * User mention in a post
 */
export interface Mention {
  userId: string;
  username: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Hashtag in a post
 */
export interface Hashtag {
  tag: string;
  startIndex: number;
  endIndex: number;
}

/**
 * URL preview/card in a post
 */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  imageBlurhash: string | null;
  siteName: string | null;
  favicon: string | null;
}

/**
 * Post creation input
 */
export interface CreatePostInput {
  content: string;
  postType?: PostType;
  visibility?: PostVisibility;
  parentId?: string | null;
  quotedPostId?: string | null;
  mediaIds?: string[];
  poll?: CreatePollInput | null;
  location?: GeoPoint | null;
  locationName?: string | null;
  sensitiveContent?: boolean;
  contentWarning?: string | null;
  subscriberOnly?: boolean;
  requiredTierId?: string | null;
}

/**
 * Poll creation input
 */
export interface CreatePollInput {
  options: string[];
  expiresIn: number; // Duration in hours
  allowMultiple?: boolean;
  hideResultsUntilEnd?: boolean;
}

/**
 * Post update input
 */
export interface UpdatePostInput {
  content?: string;
  visibility?: PostVisibility;
  sensitiveContent?: boolean;
  contentWarning?: string | null;
}

/**
 * Post report input
 */
export interface ReportPostInput {
  postId: string;
  reason: ReportReason;
  details?: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'misinformation'
  | 'copyright'
  | 'adult_content'
  | 'self_harm'
  | 'other';

/**
 * Thread context for display
 */
export interface ThreadContext {
  ancestors: Post[]; // Posts above the current post in the thread
  post: Post;
  replies: Post[]; // Direct replies
  hasMoreReplies: boolean;
}

/**
 * Post edit history entry
 */
export interface PostEdit extends BaseEntity {
  postId: string;
  previousContent: string;
  previousContentHtml: string;
  editedBy: string;
}
