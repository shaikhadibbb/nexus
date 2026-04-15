// ═══════════════════════════════════════════════════════════════════════════════
// USERS SERVICE
// Profile management, follows, blocks, mutes, search
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@nexus/database';
import { notFoundError, conflictError, forbiddenError } from '../../shared/middleware/error-handler';
import { decodeCursor, buildCursorMeta } from '../../shared/response';
import { createLogger } from '../../shared/logger';

const logger = createLogger('users-service');

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  avatarBlurhash: true,
  coverUrl: true,
  coverBlurhash: true,
  status: true,
  accountType: true,
  isVerified: true,
  website: true,
  location: true,
  followerCount: true,
  followingCount: true,
  postCount: true,
  reputationScore: true,
  isPrivate: true,
  showOnlineStatus: true,
  theme: true,
  locale: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Get user by username
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserByUsername(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username, deletedAt: null },
    select: PUBLIC_USER_SELECT,
  });

  if (!user) throw notFoundError('User');

  let relationship = null;
  if (viewerId && viewerId !== user.id) {
    relationship = await getRelationship(viewerId, user.id);
  }

  return { user, relationship };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update profile
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  data: {
    displayName?: string;
    bio?: string | null;
    website?: string | null;
    location?: string | null;
    birthDate?: string | Date | null;
    isPrivate?: boolean;
    showOnlineStatus?: boolean;
    allowDMs?: 'everyone' | 'followers' | 'none';
    theme?: 'light' | 'dark' | 'system';
    locale?: string;
    timezone?: string;
    focusModeEnabled?: boolean;
    scrollVelocityLimit?: number | null;
    contentWarningsEnabled?: boolean;
  },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: PUBLIC_USER_SELECT,
  });

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow / Unfollow
// ─────────────────────────────────────────────────────────────────────────────

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw conflictError('Cannot follow yourself');

  const target = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, isPrivate: true, status: true },
  });

  if (!target || target.status !== 'active') throw notFoundError('User');

  // Check for blocks
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: followingId, blockedId: followerId },
        { blockerId: followerId, blockedId: followingId },
      ],
    },
  });

  if (block) throw forbiddenError('Cannot follow this user');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing && !existing.isPending) throw conflictError('Already following');

  const isPending = target.isPrivate;

  await prisma.$transaction([
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: { isPending },
      create: { followerId, followingId, isPending },
    }),
    ...(!isPending
      ? [
          prisma.user.update({
            where: { id: followingId },
            data: { followerCount: { increment: 1 } },
          }),
          prisma.user.update({
            where: { id: followerId },
            data: { followingCount: { increment: 1 } },
          }),
        ]
      : []),
  ]);

  return { isPending };
}

export async function unfollowUser(followerId: string, followingId: string) {
  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (!follow) throw notFoundError('Follow relationship');

  await prisma.$transaction([
    prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    }),
    ...(!follow.isPending
      ? [
          prisma.user.update({
            where: { id: followingId },
            data: { followerCount: { decrement: 1 } },
          }),
          prisma.user.update({
            where: { id: followerId },
            data: { followingCount: { decrement: 1 } },
          }),
        ]
      : []),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Block / Unblock
// ─────────────────────────────────────────────────────────────────────────────

export async function blockUser(blockerId: string, blockedId: string, reason?: string) {
  if (blockerId === blockedId) throw conflictError('Cannot block yourself');

  // Remove any follow relationship
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: blockerId, followingId: blockedId },
        { followerId: blockedId, followingId: blockerId },
      ],
    },
  });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: { reason: reason ?? null },
    create: { blockerId, blockedId, reason: reason ?? null },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mute / Unmute
// ─────────────────────────────────────────────────────────────────────────────

export async function muteUser(
  muterId: string,
  mutedId: string,
  options?: { muteReposts?: boolean; muteNotifications?: boolean; expiresAt?: Date },
) {
  if (muterId === mutedId) throw conflictError('Cannot mute yourself');

  await prisma.mute.upsert({
    where: { muterId_mutedId: { muterId, mutedId } },
    update: {
      muteReposts: options?.muteReposts ?? true,
      muteNotifications: options?.muteNotifications ?? true,
      expiresAt: options?.expiresAt ?? null,
    },
    create: {
      muterId,
      mutedId,
      muteReposts: options?.muteReposts ?? true,
      muteNotifications: options?.muteNotifications ?? true,
      expiresAt: options?.expiresAt ?? null,
    },
  });
}

export async function unmuteUser(muterId: string, mutedId: string) {
  await prisma.mute.deleteMany({ where: { muterId, mutedId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Followers / Following lists
// ─────────────────────────────────────────────────────────────────────────────

export async function getFollowers(userId: string, limit = 20, cursor?: string) {
  const where = cursor
    ? { followingId: userId, createdAt: { lt: new Date(atob(cursor)) } }
    : { followingId: userId };

  const follows = await prisma.follow.findMany({
    where: { ...where, isPending: false },
    include: { follower: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = follows.length > limit;
  const items = hasMore ? follows.slice(0, limit) : follows;

  return {
    data: items.map((f: { follower: Record<string, unknown> }) => f.follower),
    pagination: {
      hasMore,
      nextCursor: hasMore
        ? btoa(items[items.length - 1]!.createdAt.toISOString())
        : null,
      prevCursor: null,
    },
  };
}

export async function getFollowing(userId: string, limit = 20, cursor?: string) {
  const where = cursor
    ? { followerId: userId, createdAt: { lt: new Date(atob(cursor)) } }
    : { followerId: userId };

  const follows = await prisma.follow.findMany({
    where: { ...where, isPending: false },
    include: { following: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = follows.length > limit;
  const items = hasMore ? follows.slice(0, limit) : follows;

  return {
    data: items.map((f: { following: Record<string, unknown> }) => f.following),
    pagination: {
      hasMore,
      nextCursor: hasMore ? btoa(items[items.length - 1]!.createdAt.toISOString()) : null,
      prevCursor: null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// User search
// ─────────────────────────────────────────────────────────────────────────────

export async function searchUsers(query: string, limit = 10, viewerId?: string) {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: 'active',
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: PUBLIC_USER_SELECT,
    take: limit,
    orderBy: { followerCount: 'desc' },
  });

  return users;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relationship status helper
// ─────────────────────────────────────────────────────────────────────────────

async function getRelationship(viewerId: string, targetId: string) {
  const [follow, followedBy, block, blockedBy, mute] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
    }),
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: targetId } },
    }),
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: targetId, blockedId: viewerId } },
    }),
    prisma.mute.findUnique({
      where: { muterId_mutedId: { muterId: viewerId, mutedId: targetId } },
    }),
  ]);

  return {
    isFollowing: !!follow && !follow.isPending,
    isFollowedBy: !!followedBy && !followedBy.isPending,
    isBlocked: !!block,
    isBlockedBy: !!blockedBy,
    isMuted: !!mute,
    followRequestPending: !!follow && follow.isPending,
  };
}

function atob(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf-8');
}

function btoa(str: string): string {
  return Buffer.from(str).toString('base64');
}
