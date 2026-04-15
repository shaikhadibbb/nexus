// ═══════════════════════════════════════════════════════════════════════════════
// FEED SERVICE
// Home, following, trending, and explore feeds with momentum scoring
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@nexus/database';
import { createLogger } from '../../shared/logger';
import { getRedis } from '../../shared/redis';

const logger = createLogger('feed-service');

type FeedPost = Record<string, unknown> & {
  id: string;
  authorId: string;
  createdAt: Date;
  momentumScore: number;
};

const FEED_POST_SELECT = {
  id: true,
  authorId: true,
  author: {
    select: {
      id: true, username: true, displayName: true,
      avatarUrl: true, avatarBlurhash: true, isVerified: true, accountType: true,
    },
  },
  content: true, contentHtml: true, postType: true, visibility: true,
  parentId: true, rootId: true, replyCount: true,
  quotedPostId: true,
  quotedPost: {
    select: {
      id: true, content: true, authorId: true,
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, accountType: true },
      },
      likeCount: true, repostCount: true, createdAt: true,
    },
  },
  repostOfId: true,
  likeCount: true, repostCount: true, quoteCount: true, viewCount: true, bookmarkCount: true,
  momentumScore: true, momentumVelocity: true,
  sensitiveContent: true, contentWarning: true,
  subscriberOnly: true, requiredTierId: true,
  isEdited: true, editedAt: true, deletedAt: true,
  createdAt: true, updatedAt: true,
  media: {
    include: {
      media: {
        select: {
          id: true, url: true, type: true, mimeType: true,
          width: true, height: true, aspectRatio: true, blurhash: true,
          altText: true, thumbnailUrl: true, durationSeconds: true,
        },
      },
    },
    orderBy: { position: 'asc' as const },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Following feed (chronological)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFollowingFeed(
  userId: string,
  options?: { cursor?: string; limit?: number; includeReposts?: boolean },
) {
  const limit = options?.limit ?? 20;
  const cursorDate = options?.cursor
    ? new Date(Buffer.from(options.cursor, 'base64').toString())
    : undefined;

  // Get followed user IDs
  const follows = await prisma.follow.findMany({
    where: { followerId: userId, isPending: false },
    select: { followingId: true },
  });

  const followedIds = follows.map((f: { followingId: string }) => f.followingId);
  if (followedIds.length === 0) {
    return { items: [], pagination: { hasMore: false, nextCursor: null, prevCursor: null } };
  }

  // Get muted user IDs to filter
  const mutes = await prisma.mute.findMany({
    where: { muterId: userId },
    select: { mutedId: true },
  });
  const mutedIds = new Set(mutes.map((m: { mutedId: string }) => m.mutedId));

  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: followedIds },
      deletedAt: null,
      moderationStatus: 'approved',
      ...(options?.includeReposts === false ? { repostOfId: null } : {}),
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    select: FEED_POST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const filtered = posts
    .filter((p: FeedPost) => !mutedIds.has(p.authorId))
    .slice(0, limit + 1);

  const hasMore = filtered.length > limit;
  const items = hasMore ? filtered.slice(0, limit) : filtered;

  return {
    items: items.map((post: FeedPost) => ({
      id: `feed:${post.id}`,
      post,
      feedType: 'following',
      reason: 'following',
      score: post.createdAt.getTime(),
      seenAt: null,
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(items[items.length - 1]!.createdAt.toISOString()).toString('base64')
        : null,
      prevCursor: null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Home feed (algorithmic — momentum-scored)
// ─────────────────────────────────────────────────────────────────────────────

export async function getHomeFeed(
  userId: string,
  options?: { cursor?: string; limit?: number },
) {
  const limit = options?.limit ?? 20;
  const cursorScore = options?.cursor
    ? parseFloat(Buffer.from(options.cursor, 'base64').toString())
    : 100;

  const follows = await prisma.follow.findMany({
    where: { followerId: userId, isPending: false },
    select: { followingId: true },
  });

  const followedIds = follows.map((f: { followingId: string }) => f.followingId);

  // Muted users
  const mutes = await prisma.mute.findMany({
    where: { muterId: userId },
    select: { mutedId: true },
  });
  const mutedIds = new Set(mutes.map((m: { mutedId: string }) => m.mutedId));

  // For home feed: mix following posts + trending public posts
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000);

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      moderationStatus: 'approved',
      parentId: null, // Only top-level posts in feed
      createdAt: { gte: sevenDaysAgo },
      momentumScore: { lt: cursorScore },
      OR: [
        { authorId: { in: followedIds } },
        { visibility: 'public', momentumScore: { gte: 50 } }, // Trending public content
      ],
    },
    select: FEED_POST_SELECT,
    orderBy: [{ momentumScore: 'desc' }, { likeCount: 'desc' }],
    take: limit + 1,
  });

  const filtered = posts.filter((p: FeedPost) => !mutedIds.has(p.authorId));

  const hasMore = filtered.length > limit;
  const items = hasMore ? filtered.slice(0, limit) : filtered;

  return {
    items: items.map((post: FeedPost) => ({
      id: `home:${post.id}`,
      post,
      feedType: 'home',
      reason: followedIds.includes(post.authorId) ? 'following' : 'trending',
      score: post.momentumScore,
      seenAt: null,
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(String(items[items.length - 1]!.momentumScore)).toString('base64')
        : null,
      prevCursor: null,
    },
    feedType: 'home',
    freshness: 0.85,
    diversity: 0.7,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trending feed
// ─────────────────────────────────────────────────────────────────────────────

export async function getTrendingFeed(options?: {
  cursor?: string;
  limit?: number;
  timeWindow?: 'hour' | 'day' | 'week';
}) {
  const limit = options?.limit ?? 20;
  const window = options?.timeWindow ?? 'day';
  const windowMs = window === 'hour' ? 3600000 : window === 'day' ? 86400000 : 604800000;
  const since = new Date(Date.now() - windowMs);

  const cursorScore = options?.cursor
    ? parseFloat(Buffer.from(options.cursor, 'base64').toString())
    : 100;

  const posts = await prisma.post.findMany({
    where: {
      visibility: 'public',
      deletedAt: null,
      moderationStatus: 'approved',
      parentId: null,
      createdAt: { gte: since },
      momentumScore: { lt: cursorScore },
    },
    select: FEED_POST_SELECT,
    orderBy: [{ momentumScore: 'desc' }, { likeCount: 'desc' }],
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  return {
    items: items.map((post: FeedPost) => ({
      id: `trending:${post.id}`,
      post,
      feedType: 'trending',
      reason: 'trending',
      score: post.momentumScore,
      seenAt: null,
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(String(items[items.length - 1]!.momentumScore)).toString('base64')
        : null,
      prevCursor: null,
    },
    feedType: 'trending',
    freshness: 1.0,
    diversity: 0.9,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trending hashtags
// ─────────────────────────────────────────────────────────────────────────────

export async function getTrendingHashtags(limit = 10, timeWindow: 'hour' | 'day' | 'week' = 'day') {
  const redis = getRedis();
  const cacheKey = `trending:hashtags:${timeWindow}`;

  // Try cache first
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* re-compute */ }
  }

  const windowMs = timeWindow === 'hour' ? 3600000 : timeWindow === 'day' ? 86400000 : 604800000;
  const since = new Date(Date.now() - windowMs);

  const hashtags = await prisma.hashtag.findMany({
    where: {
      posts: {
        some: {
          post: {
            createdAt: { gte: since },
            deletedAt: null,
            visibility: 'public',
          },
        },
      },
    },
    include: {
      _count: { select: { posts: true } },
    },
    orderBy: { postCount: 'desc' },
    take: limit,
  });

  const result = {
    hashtags: hashtags.map((h: { tag: string; postCount: number }) => ({
      tag: h.tag,
      postCount: h.postCount,
      postCountChange: 0,
      velocity: h.postCount / (windowMs / 3600000),
      topPosts: [],
      participantCount: h.postCount,
    })),
    timeWindow,
  };

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result)).catch(() => null);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// User profile feed
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserFeed(
  targetUserId: string,
  options?: { cursor?: string; limit?: number; includeReplies?: boolean; mediaOnly?: boolean },
) {
  const { getUserPosts } = await import('../posts/posts.service');
  const result = await getUserPosts(targetUserId, undefined, options);
  return {
    ...result,
    items: result.data.map((post: FeedPost) => ({
      id: `user:${post.id}`,
      post,
      feedType: 'user',
      reason: 'following',
      score: post.createdAt.getTime(),
      seenAt: null,
    })),
    feedType: 'user',
    freshness: 1.0,
    diversity: 0.5,
  };
}
