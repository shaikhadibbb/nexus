// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS SERVICE & ROUTER
// In-app notification management with grouping and read state
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@nexus/database';
import { requireAuth } from '../../shared/middleware/auth';
import { sendSuccess, sendNoContent } from '../../shared/response';
import { notFoundError, forbiddenError } from '../../shared/middleware/error-handler';
import { createLogger } from '../../shared/logger';
import { z } from 'zod';
import type { CreateNotificationInput, NotificationType, NotificationCounts } from '@nexus/shared-types';

const logger = createLogger('notifications');

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type as NotificationType,
        actorId: input.actorId ?? null,
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
        title: input.title,
        body: input.body,
        imageUrl: input.imageUrl ?? null,
        actionUrl: input.actionUrl ?? null,
        groupKey: input.postId ? `${input.type}:post:${input.postId}` : null,
      },
    });
  } catch (err) {
    logger.error({ err, input }, 'Failed to create notification');
  }
}

export async function getNotifications(
  userId: string,
  options?: { cursor?: string; limit?: number; onlyUnread?: boolean },
) {
  const limit = options?.limit ?? 20;
  const cursorDate = options?.cursor
    ? new Date(Buffer.from(options.cursor, 'base64').toString())
    : undefined;

  const [notifications, counts] = await Promise.all([
    prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(options?.onlyUnread ? { isRead: false } : {}),
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      include: {
        actor: {
          select: {
            id: true, username: true, displayName: true,
            avatarUrl: true, isVerified: true, accountType: true,
          },
        },
        post: { select: { id: true, content: true, authorId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
    prisma.notification.groupBy({
      by: ['type'],
      where: { recipientId: userId, isRead: false },
      _count: { _all: true },
    }),
  ]);

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;

  const countsByType = counts.reduce((acc: Record<string, number>, g: { type: string; _count: { _all: number } }) => {
    acc[g.type] = g._count._all;
    return acc;
  }, {});

  const notificationCounts: NotificationCounts = {
    total: (Object.values(countsByType) as number[]).reduce((a: number, b: number) => a + b, 0),
    likes: countsByType['like'] ?? 0,
    reposts: countsByType['repost'] ?? 0,
    replies: countsByType['reply'] ?? 0,
    follows: (countsByType['follow'] ?? 0) + (countsByType['follow_request'] ?? 0),
    mentions: countsByType['mention'] ?? 0,
    payments: (countsByType['tip_received'] ?? 0) + (countsByType['subscription_new'] ?? 0),
    system: countsByType['system'] ?? 0,
  };

  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(items[items.length - 1]!.createdAt.toISOString()).toString('base64')
        : null,
      prevCursor: null,
    },
    counts: notificationCounts,
  };
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, recipientId: true },
  });

  if (!notification) throw notFoundError('Notification');
  if (notification.recipientId !== userId) throw forbiddenError();

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsRouter: Router = Router();

// GET /api/notifications
notificationsRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cursor, limit, onlyUnread } = z
        .object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().max(50).optional(),
          onlyUnread: z.coerce.boolean().optional(),
        })
        .parse(req.query);

      const result = await getNotifications(req.userId!, { cursor, limit, onlyUnread });
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// POST /api/notifications/:id/read
notificationsRouter.post(
  '/:id/read',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await markAsRead(req.params['id']!, req.userId!);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);

// POST /api/notifications/read-all
notificationsRouter.post(
  '/read-all',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await markAllAsRead(req.userId!);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);
