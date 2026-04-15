// ═══════════════════════════════════════════════════════════════════════════════
// POSTS SERVICE
// Create, edit, delete, like, repost, bookmarks, thread context, momentum scoring
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@nexus/database';
import type { Prisma } from '@nexus/database';
import { notFoundError, forbiddenError, conflictError } from '../../shared/middleware/error-handler';
import { createLogger } from '../../shared/logger';
import { getRedis } from '../../shared/redis';

const logger = createLogger('posts-service');

const POST_SELECT = {
  id: true,
  authorId: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      avatarBlurhash: true,
      isVerified: true,
      accountType: true,
    },
  },
  content: true,
  contentHtml: true,
  postType: true,
  visibility: true,
  parentId: true,
  rootId: true,
  threadPath: true,
  replyCount: true,
  quotedPostId: true,
  quotedPost: {
    select: {
      id: true,
      content: true,
      authorId: true,
      author: {
        select: {
          id: true, username: true, displayName: true, avatarUrl: true,
          avatarBlurhash: true, isVerified: true, accountType: true,
        },
      },
      likeCount: true, repostCount: true, viewCount: true, createdAt: true,
    },
  },
  repostOfId: true,
  likeCount: true,
  repostCount: true,
  quoteCount: true,
  viewCount: true,
  bookmarkCount: true,
  momentumScore: true,
  momentumVelocity: true,
  language: true,
  moderationStatus: true,
  sensitiveContent: true,
  contentWarning: true,
  subscriberOnly: true,
  requiredTierId: true,
  isEdited: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  media: {
    include: {
      media: {
        select: {
          id: true, url: true, type: true, mimeType: true,
          width: true, height: true, aspectRatio: true, sizeBytes: true,
          blurhash: true, dominantColor: true, altText: true,
          thumbnailUrl: true, durationSeconds: true,
        },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  poll: {
    include: {
      options: { orderBy: { order: 'asc' as const } },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Render post content HTML (links, mentions, hashtags)
// ─────────────────────────────────────────────────────────────────────────────

function renderContentHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /(https?:\/\/[^\s<>"]+)/g,
      '<a href="$1" rel="noopener noreferrer" target="_blank">$1</a>',
    )
    .replace(/@([a-zA-Z0-9_]+)/g, '<a href="/users/$1" data-mention="$1">@$1</a>')
    .replace(/#([a-zA-Z0-9_]+)/g, '<a href="/hashtags/$1" data-hashtag="$1">#$1</a>')
    .replace(/\n/g, '<br>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Create post
// ─────────────────────────────────────────────────────────────────────────────

export async function createPost(
  authorId: string,
  input: {
    content: string;
    postType?: string;
    visibility?: string;
    parentId?: string | null;
    quotedPostId?: string | null;
    mediaIds?: string[];
    poll?: {
      options: string[];
      expiresIn: number;
      allowMultiple?: boolean;
      hideResultsUntilEnd?: boolean;
    } | null;
    location?: { latitude: number; longitude: number } | null;
    locationName?: string | null;
    sensitiveContent?: boolean;
    contentWarning?: string | null;
    subscriberOnly?: boolean;
    requiredTierId?: string | null;
  },
) {
  const contentHtml = renderContentHtml(input.content);

  let parentPost = null;
  let threadPath = '/';
  let rootId: string | null = null;

  if (input.parentId) {
    parentPost = await prisma.post.findUnique({
      where: { id: input.parentId, deletedAt: null },
      select: { id: true, rootId: true, threadPath: true, authorId: true },
    });
    if (!parentPost) throw notFoundError('Parent post');
    rootId = parentPost.rootId ?? parentPost.id;
    threadPath = `${parentPost.threadPath}${parentPost.id}/`;
  }

  // Extract hashtags and mentions from content
  const hashtagMatches = [...input.content.matchAll(/#([a-zA-Z0-9_]+)/g)].map((m) => m[1]!);
  const mentionMatches = [...input.content.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1]!);

  const post = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newPost = await tx.post.create({
      data: {
        authorId,
        content: input.content,
        contentHtml,
        postType: (input.postType as 'text') ?? 'text',
        visibility: (input.visibility as 'public') ?? 'public',
        parentId: input.parentId ?? null,
        rootId,
        threadPath,
        quotedPostId: input.quotedPostId ?? null,
        latitude: input.location?.latitude ?? null,
        longitude: input.location?.longitude ?? null,
        locationName: input.locationName ?? null,
        sensitiveContent: input.sensitiveContent ?? false,
        contentWarning: input.contentWarning ?? null,
        subscriberOnly: input.subscriberOnly ?? false,
        requiredTierId: input.requiredTierId ?? null,
        moderationStatus: 'approved',
        // Link media
        ...(input.mediaIds?.length
          ? {
              media: {
                create: input.mediaIds.map((mediaId, order) => ({ mediaId, order })),
              },
            }
          : {}),
        // Create poll
        ...(input.poll
          ? {
              poll: {
                create: {
                  expiresAt: new Date(Date.now() + input.poll.expiresIn * 3600000),
                  allowMultiple: input.poll.allowMultiple ?? false,
                  hideResultsUntilEnd: input.poll.hideResultsUntilEnd ?? false,
                  options: {
                    create: input.poll.options.map((text, order) => ({ text, order })),
                  },
                },
              },
            }
          : {}),
      },
      select: POST_SELECT,
    });

    // Increment author post count
    await tx.user.update({ where: { id: authorId }, data: { postCount: { increment: 1 } } });

    // Increment parent reply count
    if (input.parentId) {
      await tx.post.update({
        where: { id: input.parentId },
        data: { replyCount: { increment: 1 } },
      });
    }

    // Increment quote count
    if (input.quotedPostId) {
      await tx.post.update({
        where: { id: input.quotedPostId },
        data: { quoteCount: { increment: 1 } },
      });
    }

    // Upsert hashtags
    for (const tag of hashtagMatches) {
      const hashtag = await tx.hashtag.upsert({
        where: { tag },
        update: { postCount: { increment: 1 } },
        create: { tag, postCount: 1 },
      });
      await tx.postHashtag.upsert({
        where: { postId_hashtagId: { postId: newPost.id, hashtagId: hashtag.id } },
        update: {},
        create: { postId: newPost.id, hashtagId: hashtag.id },
      });
    }

    // Create mentions
    if (mentionMatches.length > 0) {
      const mentionedUsers = await tx.user.findMany({
        where: { username: { in: mentionMatches } },
        select: { id: true, username: true },
      });

      await tx.postMention.createMany({
        data: mentionedUsers.map((u: { id: string; username: string }) => ({
          postId: newPost.id,
          userId: u.id,
          username: u.username,
        })),
        skipDuplicates: true,
      });
    }

    return newPost;
  });

  return post;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get post
// ─────────────────────────────────────────────────────────────────────────────

export async function getPost(postId: string, viewerId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: POST_SELECT,
  });

  if (!post) throw notFoundError('Post');

  let isLiked = false;
  let isBookmarked = false;
  let isReposted = false;

  if (viewerId) {
    const [liked, bookmarked, reposted] = await Promise.all([
      prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId: viewerId } },
        select: { id: true },
      }),
      prisma.bookmark.findUnique({
        where: { postId_userId: { postId, userId: viewerId } },
        select: { id: true },
      }),
      prisma.post.findFirst({
        where: { authorId: viewerId, repostOfId: postId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    isLiked = !!liked;
    isBookmarked = !!bookmarked;
    isReposted = !!reposted;
  }

  // Increment view count async
  prisma.post
    .update({ where: { id: postId }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);

  return { ...post, isLiked, isBookmarked, isReposted };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get thread context
// ─────────────────────────────────────────────────────────────────────────────

export async function getThreadContext(postId: string, viewerId?: string) {
  const post = await getPost(postId, viewerId);

  // Get ancestors (posts above in the thread chain)
  const ancestors: typeof post[] = [];
  let currentId = post.parentId ?? null;
  while (currentId) {
    const ancestor = await getPost(currentId, viewerId).catch(() => null);
    if (!ancestor) break;
    ancestors.unshift(ancestor);
    currentId = ancestor.parentId ?? null;
    if (ancestors.length >= 10) break; // Safety limit
  }

  // Get immediate replies
  const replies = await prisma.post.findMany({
    where: { parentId: postId, deletedAt: null },
    select: POST_SELECT,
    orderBy: [{ likeCount: 'desc' }, { createdAt: 'asc' }],
    take: 20,
  });

  return { ancestors, post, replies, hasMoreReplies: replies.length >= 20 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update post
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePost(
  postId: string,
  authorId: string,
  data: { content?: string; visibility?: string; sensitiveContent?: boolean; contentWarning?: string | null },
) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, content: true, contentHtml: true },
  });

  if (!post) throw notFoundError('Post');
  if (post.authorId !== authorId) throw forbiddenError('Not your post');

  // Save edit history
  await prisma.postEdit.create({
    data: {
      postId,
      previousContent: post.content,
      previousContentHtml: post.contentHtml,
      editedBy: authorId,
    },
  });

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      content: data.content ?? undefined,
      contentHtml: data.content ? renderContentHtml(data.content) : undefined,
      visibility: data.visibility as 'public' | undefined ?? undefined,
      sensitiveContent: data.sensitiveContent ?? undefined,
      contentWarning: data.contentWarning ?? undefined,
      isEdited: true,
      editedAt: new Date(),
    },
    select: POST_SELECT,
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete post
// ─────────────────────────────────────────────────────────────────────────────

export async function deletePost(postId: string, authorId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, parentId: true, repostOfId: true, quotedPostId: true },
  });

  if (!post) throw notFoundError('Post');
  if (post.authorId !== authorId) throw forbiddenError('Not your post');

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.post.update({
      where: { id: postId },
      data: { deletedAt: new Date(), content: '[deleted]', contentHtml: '[deleted]' },
    });

    await tx.user.update({ where: { id: authorId }, data: { postCount: { decrement: 1 } } });

    if (post.parentId) {
      await tx.post.update({
        where: { id: post.parentId },
        data: { replyCount: { decrement: 1 } },
      });
    }
   if (post.quotedPostId) {
      await tx.post.update({
        where: { id: post.quotedPostId },
        data: { quoteCount: { decrement: 1 } },
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Like / Unlike
// ─────────────────────────────────────────────────────────────────────────────

export async function likePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true },
  });
  if (!post) throw notFoundError('Post');

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) throw conflictError('Already liked');

  await prisma.$transaction([
    prisma.postLike.create({ data: { postId, userId } }),
    prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
  ]);

  // Update momentum score asynchronously
  updateMomentumScore(postId).catch(() => null);

  return { liked: true };
}

export async function unlikePost(postId: string, userId: string) {
  const like = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (!like) throw notFoundError('Like');

  await prisma.$transaction([
    prisma.postLike.delete({ where: { postId_userId: { postId, userId } } }),
    prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
  ]);

  updateMomentumScore(postId).catch(() => null);

  return { liked: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookmark / Unbookmark
// ─────────────────────────────────────────────────────────────────────────────

export async function bookmarkPost(postId: string, userId: string, collectionId?: string) {
  const post = await prisma.post.findUnique({ where: { id: postId, deletedAt: null }, select: { id: true } });
  if (!post) throw notFoundError('Post');

  const existing = await prisma.bookmark.findUnique({ where: { postId_userId: { postId, userId } } });
  if (existing) throw conflictError('Already bookmarked');

  await prisma.$transaction([
    prisma.bookmark.create({ data: { postId, userId, collectionId: collectionId ?? null } }),
    prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } } }),
  ]);

  return { bookmarked: true };
}

export async function unbookmarkPost(postId: string, userId: string) {
  const bookmark = await prisma.bookmark.findUnique({ where: { postId_userId: { postId, userId } } });
  if (!bookmark) throw notFoundError('Bookmark');

  await prisma.$transaction([
    prisma.bookmark.delete({ where: { postId_userId: { postId, userId } } }),
    prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { decrement: 1 } } }),
  ]);

  return { bookmarked: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Momentum score algorithm
// Engagement velocity + acceleration-based scoring
// ─────────────────────────────────────────────────────────────────────────────

export async function updateMomentumScore(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      likeCount: true,
      repostCount: true,
      quoteCount: true,
      replyCount: true,
      viewCount: true,
      createdAt: true,
      momentumScore: true,
      momentumVelocity: true,
      momentumUpdatedAt: true,
    },
  });

  if (!post) return;

  const now = Date.now();
  const ageHours = (now - post.createdAt.getTime()) / 3600000;
  const timeSinceUpdateHours = (now - post.momentumUpdatedAt.getTime()) / 3600000;

  // Weighted engagement score
  const rawEngagement =
    post.likeCount * 1.0 +
    post.repostCount * 2.5 +
    post.quoteCount * 2.0 +
    post.replyCount * 1.5;

  const views = Math.max(post.viewCount, 1);
  const engagementRate = rawEngagement / views;

  // Time decay — HN-style with configurable gravity
  const gravity = 1.6;
  const decayedScore = rawEngagement / Math.pow(ageHours + 2, gravity);

  // Velocity: change in engagement rate since last update
  const prevScore = post.momentumScore;
  const velocity = timeSinceUpdateHours > 0
    ? (decayedScore - prevScore) / timeSinceUpdateHours
    : 0;

  // Normalize to 0-100
  const finalScore = Math.min(100, decayedScore * 10);

  await prisma.post.update({
    where: { id: postId },
    data: {
      momentumScore: finalScore,
      momentumVelocity: velocity,
      momentumUpdatedAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Get user's posts (profile feed)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserPosts(
  userId: string,
  viewerId?: string,
  options?: { limit?: number; cursor?: string; includeReplies?: boolean; mediaOnly?: boolean },
) {
  const limit = options?.limit ?? 20;
  const cursorId = options?.cursor ? Buffer.from(options.cursor, 'base64').toString() : undefined;

  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      moderationStatus: { in: ['approved', 'pending'] },
      ...(options?.includeReplies === false ? { parentId: null } : {}),
      ...(options?.mediaOnly
        ? { media: { some: {} } }
        : {}),
      ...(cursorId ? { id: { lt: cursorId } } : {}),
    },
    select: POST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(items[items.length - 1]!.id).toString('base64')
        : null,
      prevCursor: null,
    },
  };
}
