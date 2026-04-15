// ═══════════════════════════════════════════════════════════════════════════════
// GRAPHQL SCHEMA
// Type definitions for the GraphQL API
// ═══════════════════════════════════════════════════════════════════════════════

export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar Upload

  # ─────────────────────────────────────────────────────────────────────────────
  # Enums
  # ─────────────────────────────────────────────────────────────────────────────

  enum PostVisibility { public followers subscribers mentioned private }
  enum PostType { text media poll thread quote repost }
  enum AccountType { personal creator business verified }
  enum FeedType { home following trending explore user hashtag }
  enum NotificationType {
    like repost quote reply mention follow follow_request
    follow_accepted tip_received subscription_new subscription_renewal
    post_milestone system
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Common
  # ─────────────────────────────────────────────────────────────────────────────

  type PageInfo {
    hasMore: Boolean!
    nextCursor: String
    prevCursor: String
    totalCount: Int
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # User
  # ─────────────────────────────────────────────────────────────────────────────

  type User {
    id: ID!
    username: String!
    displayName: String!
    bio: String
    avatarUrl: String
    avatarBlurhash: String
    coverUrl: String
    coverBlurhash: String
    accountType: AccountType!
    isVerified: Boolean!
    website: String
    location: String
    followerCount: Int!
    followingCount: Int!
    postCount: Int!
    reputationScore: Float!
    isPrivate: Boolean!
    createdAt: DateTime!

    # Viewer context (requires auth)
    isFollowing: Boolean
    isFollowedBy: Boolean
    isBlocked: Boolean
    isMuted: Boolean

    # Nested
    posts(limit: Int, cursor: String, includeReplies: Boolean): PostConnection!
    subscriptionTiers: [SubscriptionTier!]!
  }

  type UserMinimal {
    id: ID!
    username: String!
    displayName: String!
    avatarUrl: String
    avatarBlurhash: String
    isVerified: Boolean!
    accountType: AccountType!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Post
  # ─────────────────────────────────────────────────────────────────────────────

  type Post {
    id: ID!
    author: UserMinimal!
    content: String!
    contentHtml: String!
    postType: PostType!
    visibility: PostVisibility!
    parentId: ID
    rootId: ID
    replyCount: Int!
    quotedPost: Post
    likeCount: Int!
    repostCount: Int!
    quoteCount: Int!
    viewCount: Int!
    bookmarkCount: Int!
    momentumScore: Float!
    momentumVelocity: Float!
    sensitiveContent: Boolean!
    contentWarning: String
    subscriberOnly: Boolean!
    isEdited: Boolean!
    editedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime

    # Viewer context
    isLiked: Boolean
    isReposted: Boolean
    isBookmarked: Boolean

    # Nested
    replies(limit: Int, cursor: String): PostConnection!
    media: [MediaAsset!]!
  }

  type PostConnection {
    nodes: [Post!]!
    pageInfo: PageInfo!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Feed
  # ─────────────────────────────────────────────────────────────────────────────

  type FeedItem {
    id: ID!
    post: Post!
    feedType: FeedType!
    reason: String!
    score: Float!
    seenAt: DateTime
  }

  type FeedConnection {
    items: [FeedItem!]!
    pageInfo: PageInfo!
    feedType: FeedType!
    freshness: Float!
    diversity: Float!
  }

  type TrendingHashtag {
    tag: String!
    postCount: Int!
    velocity: Float!
    participantCount: Int!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Notifications
  # ─────────────────────────────────────────────────────────────────────────────

  type Notification {
    id: ID!
    type: NotificationType!
    actor: UserMinimal
    post: PostPreview
    title: String!
    body: String!
    imageUrl: String
    isRead: Boolean!
    readAt: DateTime
    actionUrl: String
    createdAt: DateTime!
  }

  type PostPreview {
    id: ID!
    content: String!
    authorId: ID!
  }

  type NotificationCounts {
    total: Int!
    likes: Int!
    reposts: Int!
    replies: Int!
    follows: Int!
    mentions: Int!
    payments: Int!
    system: Int!
  }

  type NotificationConnection {
    nodes: [Notification!]!
    pageInfo: PageInfo!
    counts: NotificationCounts!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Media
  # ─────────────────────────────────────────────────────────────────────────────

  type MediaAsset {
    id: ID!
    url: String!
    type: String!
    mimeType: String!
    width: Int!
    height: Int!
    aspectRatio: Float!
    blurhash: String
    dominantColor: String
    altText: String
    thumbnailUrl: String
    durationSeconds: Float
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Creator Economy
  # ─────────────────────────────────────────────────────────────────────────────

  type SubscriptionTier {
    id: ID!
    creatorId: ID!
    name: String!
    description: String!
    priceMonthly: Int!
    priceYearly: Int
    benefits: [String!]!
    subscriberCount: Int!
    isActive: Boolean!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Thread context
  # ─────────────────────────────────────────────────────────────────────────────

  type ThreadContext {
    ancestors: [Post!]!
    post: Post!
    replies: [Post!]!
    hasMoreReplies: Boolean!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Queries
  # ─────────────────────────────────────────────────────────────────────────────

  type Query {
    # Viewer
    me: User

    # Users
    user(username: String!): User
    searchUsers(query: String!, limit: Int): [UserMinimal!]!

    # Posts
    post(id: ID!): Post
    postThread(id: ID!): ThreadContext

    # Feed
    feed(
      feedType: FeedType
      cursor: String
      limit: Int
      userId: ID
      hashtag: String
      includeReplies: Boolean
      includeReposts: Boolean
    ): FeedConnection!

    trendingHashtags(limit: Int, timeWindow: String): [TrendingHashtag!]!

    # Notifications
    notifications(cursor: String, limit: Int, onlyUnread: Boolean): NotificationConnection!

    # Conversations (handled via REST for performance, but exposed here)
    conversationCount: Int!
  }

  # ─────────────────────────────────────────────────────────────────────────────
  # Mutations
  # ─────────────────────────────────────────────────────────────────────────────

  type Mutation {
    # Posts
    createPost(
      content: String!
      postType: PostType
      visibility: PostVisibility
      parentId: ID
      quotedPostId: ID
      mediaIds: [ID!]
      sensitiveContent: Boolean
      contentWarning: String
      subscriberOnly: Boolean
    ): Post!

    updatePost(
      id: ID!
      content: String
      visibility: PostVisibility
      sensitiveContent: Boolean
      contentWarning: String
    ): Post!

    deletePost(id: ID!): Boolean!

    likePost(postId: ID!): Post!
    unlikePost(postId: ID!): Post!
    bookmarkPost(postId: ID!): Post!
    unbookmarkPost(postId: ID!): Post!

    # Users
    followUser(username: String!): User!
    unfollowUser(username: String!): Boolean!
    blockUser(username: String!, reason: String): Boolean!
    unblockUser(username: String!): Boolean!

    updateProfile(
      displayName: String
      bio: String
      website: String
      location: String
      isPrivate: Boolean
      focusModeEnabled: Boolean
    ): User!

    # Notifications
    markNotificationRead(id: ID!): Boolean!
    markAllNotificationsRead: Boolean!
  }
`;
