// ═══════════════════════════════════════════════════════════════════════════════
// API TYPE DEFINITIONS
// Request/response types for API endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { User, PublicUser, CreateUserInput, UpdateUserInput, RelationshipStatus } from './user';
import { Post, CreatePostInput, UpdatePostInput, ThreadContext } from './post';
import { FeedResponse, FeedParams, TrendingTopicsResponse, UserList } from './feed';
import { Notification, NotificationCounts, NotificationPreferences } from './notification';
import { Conversation, ConversationListItem, Message, SendMessageInput } from './conversation';
import { MediaAsset, UploadInitResponse } from './media';
import { CreateTipInput, CreateSubscriptionInput, EarningsSummary, Transaction } from './payment';
import { PaginatedResponse, ApiResponse } from './common';

// ─────────────────────────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | string;
}

export interface RegisterRequest extends CreateUserInput {}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | string;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GetUserResponse {
  user: PublicUser;
  relationship?: RelationshipStatus;
}

export interface UpdateUserRequest extends UpdateUserInput {}

export interface UpdateUserResponse {
  user: User;
}

export interface GetFollowersResponse extends PaginatedResponse<PublicUser> {}

export interface GetFollowingResponse extends PaginatedResponse<PublicUser> {}

export interface SearchUsersRequest {
  query: string;
  limit?: number;
}

export interface SearchUsersResponse {
  users: PublicUser[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// POST ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface CreatePostRequest extends CreatePostInput {}

export interface CreatePostResponse {
  post: Post;
}

export interface GetPostResponse {
  post: Post;
  context?: ThreadContext;
}

export interface UpdatePostRequest extends UpdatePostInput {}

export interface UpdatePostResponse {
  post: Post;
}

export interface GetPostRepliesResponse extends PaginatedResponse<Post> {}

export interface SearchPostsRequest {
  query: string;
  filters?: {
    authorId?: string;
    hasMedia?: boolean;
    startDate?: string;
    endDate?: string;
  };
  limit?: number;
  cursor?: string;
}

export interface SearchPostsResponse extends PaginatedResponse<Post> {}

// ─────────────────────────────────────────────────────────────────────────────────
// FEED ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GetFeedRequest extends FeedParams {}

export interface GetFeedResponse extends FeedResponse {}

export interface GetTrendingResponse extends TrendingTopicsResponse {}

// ─────────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GetNotificationsResponse extends PaginatedResponse<Notification> {
  counts: NotificationCounts;
}

export interface UpdateNotificationPreferencesRequest extends Partial<NotificationPreferences> {}

// ─────────────────────────────────────────────────────────────────────────────────
// CONVERSATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface GetConversationsResponse extends PaginatedResponse<ConversationListItem> {}

export interface GetConversationResponse {
  conversation: Conversation;
  messages: PaginatedResponse<Message>;
}

export interface SendMessageRequest extends SendMessageInput {}

export interface SendMessageResponse {
  message: Message;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MEDIA ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface InitUploadRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface InitUploadResponse extends UploadInitResponse {}

export interface CompleteUploadRequest {
  uploadId: string;
  mediaId: string;
  altText?: string;
}

export interface CompleteUploadResponse {
  media: MediaAsset;
}

// ─────────────────────────────────────────────────────────────────────────────────
// PAYMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface CreateTipRequest extends CreateTipInput {}

export interface CreateTipResponse {
  transaction: Transaction;
  clientSecret?: string; // For Stripe Elements
}

export interface CreateSubscriptionRequest extends CreateSubscriptionInput {}

export interface GetEarningsRequest {
  period: 'day' | 'week' | 'month' | 'year' | 'all_time';
}

export interface GetEarningsResponse extends EarningsSummary {}

// ─────────────────────────────────────────────────────────────────────────────────
// LIST ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────────

export interface CreateListRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
  memberIds?: string[];
}

export interface CreateListResponse {
  list: UserList;
}

export interface GetListsResponse extends PaginatedResponse<UserList> {}
