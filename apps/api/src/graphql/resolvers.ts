// ═══════════════════════════════════════════════════════════════════════════════
// GRAPHQL RESOLVERS
// Context-aware resolvers with N+1 protection via batched DB queries
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@nexus/database';
import { GraphQLError } from 'graphql';
import * as postsService from '../modules/posts/posts.service';
import * as usersService from '../modules/users/users.service';
import * as feedService from '../modules/feed/feed.service';
import { getNotifications, markAsRead, markAllAsRead } from '../modules/notifications/notifications.router';
import { createLogger } from '../shared/logger';

const logger = createLogger('graphql-resolvers');

export interface GraphQLContext {
  userId?: string;
  token?: string;
}

function requireAuth(ctx: GraphQLContext): string {
  if (!ctx.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return ctx.userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post resolver helper — flatten media
// ─────────────────────────────────────────────────────────────────────────────

function flattenPostMedia(post: Record<string, unknown>) {
  const raw = post as { media?: { media: unknown }[] };
  return {
    ...post,
    media: raw.media?.map((pm) => pm.media) ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolvers
// ─────────────────────────────────────────────────────────────────────────────

export const resolvers = {
  // ──────────────────────────────────────────────────────────────────────────
  // Query
  // ──────────────────────────────────────────────────────────────────────────
  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.userId) return null;
      return prisma.user.findUnique({ where: { id: ctx.userId } });
    },

    user: async (_: unknown, { username }: { username: string }, ctx: GraphQLContext) => {
      const result = await usersService.getUserByUsername(username, ctx.userId).catch(() => null);
      return result?.user ?? null;
    },

    searchUsers: async (_: unknown, { query, limit }: { query: string; limit?: number }) => {
      return usersService.searchUsers(query, limit ?? 10);
    },

    post: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const result = await postsService.getPost(id, ctx.userId).catch(() => null);
      if (!result) return null;
      return flattenPostMedia(result as Record<string, unknown>);
    },

    postThread: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const ctx2 = await postsService.getThreadContext(id, ctx.userId).catch(() => null);
      if (!ctx2) return null;
      return {
        ...ctx2,
        post: flattenPostMedia(ctx2.post as Record<string, unknown>),
        ancestors: ctx2.ancestors.map((p: Record<string, unknown>) => flattenPostMedia(p)),
        replies: ctx2.replies.map((p: Record<string, unknown>) => flattenPostMedia(p)),
      };
    },

    feed: async (
      _: unknown,
      args: {
        feedType?: string;
        cursor?: string;
        limit?: number;
        userId?: string;
        hashtag?: string;
        includeReplies?: boolean;
        includeReposts?: boolean;
      },
      ctx: GraphQLContext,
    ) => {
      const feedType = args.feedType ?? 'home';

      let result;
      if (feedType === 'following' && ctx.userId) {
        result = await feedService.getFollowingFeed(ctx.userId, args);
      } else if (feedType === 'trending') {
        result = await feedService.getTrendingFeed(args);
      } else if (feedType === 'user' && args.userId) {
        result = await feedService.getUserFeed(args.userId, args);
      } else if (ctx.userId) {
        result = await feedService.getHomeFeed(ctx.userId, args);
      } else {
        result = await feedService.getTrendingFeed(args);
      }

      return {
        items: result.items.map((item: { post: Record<string, unknown> } & Record<string, unknown>) => ({
          ...item,
          post: flattenPostMedia(item.post as Record<string, unknown>),
        })),
        pageInfo: result.pagination,
        feedType: feedType,
        freshness: (result as { freshness?: number }).freshness ?? 1.0,
        diversity: (result as { diversity?: number }).diversity ?? 0.7,
      };
    },

    trendingHashtags: async (
      _: unknown,
      { limit, timeWindow }: { limit?: number; timeWindow?: string },
    ) => {
      const result = await feedService.getTrendingHashtags(
        limit ?? 10,
        (timeWindow as 'hour' | 'day' | 'week') ?? 'day',
      );
      return result.hashtags;
    },

    notifications: async (_: unknown, args: { cursor?: string; limit?: number; onlyUnread?: boolean }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const result = await getNotifications(userId, args);
      return {
        nodes: result.data,
        pageInfo: result.pagination,
        counts: result.counts,
      };
    },

    conversationCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.userId) return 0;
      return prisma.conversationMember.count({ where: { userId: ctx.userId, isHidden: false } });
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Mutation
  // ──────────────────────────────────────────────────────────────────────────
  Mutation: {
    createPost: async (_: unknown, args: Record<string, unknown>, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const post = await postsService.createPost(userId, args as Parameters<typeof postsService.createPost>[1]);
      return flattenPostMedia(post as Record<string, unknown>);
    },

    updatePost: async (_: unknown, { id, ...data }: { id: string } & Record<string, unknown>, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const post = await postsService.updatePost(id, userId, data as Parameters<typeof postsService.updatePost>[2]);
      return flattenPostMedia(post as Record<string, unknown>);
    },

    deletePost: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await postsService.deletePost(id, userId);
      return true;
    },

    likePost: async (_: unknown, { postId }: { postId: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await postsService.likePost(postId, userId);
      const post = await postsService.getPost(postId, userId);
      return flattenPostMedia(post as Record<string, unknown>);
    },

    unlikePost: async (_: unknown, { postId }: { postId: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await postsService.unlikePost(postId, userId);
      const post = await postsService.getPost(postId, userId);
      return flattenPostMedia(post as Record<string, unknown>);
    },

    bookmarkPost: async (_: unknown, { postId }: { postId: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await postsService.bookmarkPost(postId, userId);
      const post = await postsService.getPost(postId, userId);
      return flattenPostMedia(post as Record<string, unknown>);
    },

    unbookmarkPost: async (_: unknown, { postId }: { postId: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await postsService.unbookmarkPost(postId, userId);
      const post = await postsService.getPost(postId, userId);
      return flattenPostMedia(post as Record<string, unknown>);
    },

    followUser: async (_: unknown, { username }: { username: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const { user } = await usersService.getUserByUsername(username);
      await usersService.followUser(userId, user.id);
      return user;
    },

    unfollowUser: async (_: unknown, { username }: { username: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const { user } = await usersService.getUserByUsername(username);
      await usersService.unfollowUser(userId, user.id);
      return true;
    },

    blockUser: async (_: unknown, { username, reason }: { username: string; reason?: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const { user } = await usersService.getUserByUsername(username);
      await usersService.blockUser(userId, user.id, reason);
      return true;
    },

    unblockUser: async (_: unknown, { username }: { username: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      const { user } = await usersService.getUserByUsername(username);
      await usersService.unblockUser(userId, user.id);
      return true;
    },

    updateProfile: async (_: unknown, data: Record<string, unknown>, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return usersService.updateProfile(userId, data as Parameters<typeof usersService.updateProfile>[1]);
    },

    markNotificationRead: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await markAsRead(id, userId);
      return true;
    },

    markAllNotificationsRead: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      await markAllAsRead(userId);
      return true;
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Type resolvers (N+1 protection)
  // ──────────────────────────────────────────────────────────────────────────

  User: {
    posts: async (user: { id: string }, args: { limit?: number; cursor?: string; includeReplies?: boolean }) => {
      const result = await postsService.getUserPosts(user.id, undefined, args);
      return {
        nodes: result.data.map((p: Record<string, unknown>) => flattenPostMedia(p)),
        pageInfo: result.pagination,
      };
    },
    subscriptionTiers: async (user: { id: string }) => {
      return prisma.subscriptionTier.findMany({
        where: { creatorId: user.id, isActive: true },
      });
    },
  },

  Post: {
    replies: async (post: { id: string }, args: { limit?: number; cursor?: string }, ctx: GraphQLContext) => {
      const limit = args.limit ?? 10;
      const posts = await prisma.post.findMany({
        where: { parentId: post.id, deletedAt: null },
        take: limit,
        orderBy: { likeCount: 'desc' },
      });
      return {
        nodes: posts,
        pageInfo: { hasMore: posts.length === limit, nextCursor: null, prevCursor: null },
      };
    },
  },
};
