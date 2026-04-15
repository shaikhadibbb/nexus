// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS SERVICE & ROUTER
// Direct messages, group chats, typing indicators, read receipts
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@nexus/database';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response';
import { notFoundError, forbiddenError, conflictError } from '../../shared/middleware/error-handler';
import { createConversationSchema, sendMessageSchema } from '../../shared/validation';
import { createLogger } from '../../shared/logger';

const logger = createLogger('conversations');

const MEMBER_SELECT = {
  userId: true,
  role: true,
  joinedAt: true,
  lastReadAt: true,
  lastReadMessageId: true,
  isMuted: true,
  isHidden: true,
  user: {
    select: {
      id: true, username: true, displayName: true,
      avatarUrl: true, avatarBlurhash: true, isVerified: true, accountType: true,
    },
  },
};

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  sender: {
    select: {
      id: true, username: true, displayName: true,
      avatarUrl: true, avatarBlurhash: true, isVerified: true,
    },
  },
  contentType: true,
  content: true,
  replyToId: true,
  replyTo: {
    select: {
      id: true, content: true, senderId: true,
      sender: { select: { id: true, username: true } },
    },
  },
  isEdited: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  reactions: { select: { emoji: true, userId: true } },
  readBy: { select: { userId: true, readAt: true } },
  media: {
    include: {
      media: {
        select: {
          id: true, url: true, type: true, mimeType: true,
          width: true, height: true, blurhash: true, altText: true,
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────────────────────────────────────

async function getOrCreateDirectConversation(userA: string, userB: string): Promise<string> {
  // Find existing DM between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'direct',
      members: { every: { userId: { in: [userA, userB] } } },
    },
    include: { members: { select: { userId: true } } },
  });

  if (existing && existing.members.length === 2) {
    // Check it's exactly these two
    const memberIds = new Set(existing.members.map((m: { userId: string }) => m.userId));
    if (memberIds.has(userA) && memberIds.has(userB)) return existing.id;
  }

  // Create new DM conversation
  const conversation = await prisma.conversation.create({
    data: {
      type: 'direct',
      isAccepted: false, // Requires acceptance for non-followers
      members: {
        createMany: {
          data: [
            { userId: userA, role: 'member' },
            { userId: userB, role: 'member' },
          ],
        },
      },
    },
    select: { id: true },
  });

  return conversation.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const conversationsRouter: Router = Router();

// GET /api/conversations
conversationsRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cursor, limit } = z
        .object({ cursor: z.string().optional(), limit: z.coerce.number().int().max(50).optional() })
        .parse(req.query);

      const cursorDate = cursor ? new Date(Buffer.from(cursor, 'base64').toString()) : undefined;

      const memberships = await prisma.conversationMember.findMany({
        where: {
          userId: req.userId!,
          isHidden: false,
        },
        include: {
          conversation: {
            include: {
              members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, accountType: true } } } },
            },
          },
        },
        orderBy: { conversation: { updatedAt: 'desc' } },
        take: (limit ?? 20) + 1,
      });

      const hasMore = memberships.length > (limit ?? 20);
      const items = hasMore ? memberships.slice(0, limit ?? 20) : memberships;

      const conversations = await Promise.all(
        items.map(async (m: {
          conversationId: string;
          lastReadAt: Date | null;
          isMuted: boolean;
          conversation: {
            type: string;
            name: string | null;
            avatarUrl: string | null;
            updatedAt: Date;
            members: { userId: string; user: Record<string, unknown> }[];
          };
        }) => {
          const unread = await prisma.message.count({
            where: {
              conversationId: m.conversationId,
              createdAt: { gt: m.lastReadAt ?? new Date(0) },
              senderId: { not: req.userId! },
              deletedAt: null,
            },
          });

          const lastMessage = await prisma.message.findFirst({
            where: { conversationId: m.conversationId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              contentType: true,
              senderId: true,
              sender: { select: { id: true, username: true } },
              createdAt: true,
            },
          });

          const otherMembers = m.conversation.members
            .filter((mem: { userId: string }) => mem.userId !== req.userId)
            .map((mem: { user: Record<string, unknown> }) => mem.user);

          return {
            id: m.conversationId,
            type: m.conversation.type,
            name: m.conversation.name,
            avatarUrl: m.conversation.avatarUrl,
            otherMembers,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  contentType: lastMessage.contentType,
                  senderId: lastMessage.senderId,
                  senderUsername: lastMessage.sender.username,
                  hasMedia: false,
                  createdAt: lastMessage.createdAt,
                }
              : null,
            unreadCount: unread,
            isMuted: m.isMuted,
            updatedAt: m.conversation.updatedAt,
          };
        }),
      );

      sendSuccess(res, {
        data: conversations,
        pagination: {
          hasMore,
          nextCursor: hasMore
            ? Buffer.from(items[items.length - 1]!.joinedAt.toISOString()).toString('base64')
            : null,
          prevCursor: null,
        },
      });
    } catch (err) { next(err); }
  },
);

// POST /api/conversations
conversationsRouter.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createConversationSchema.parse(req.body);

      let conversationId: string;

      if (!body.isGroup && body.participantIds.length === 1) {
        conversationId = await getOrCreateDirectConversation(
          req.userId!,
          body.participantIds[0]!,
        );
      } else {
        // Group conversation
        const conversation = await prisma.conversation.create({
          data: {
            type: 'group',
            name: body.groupName ?? null,
            creatorId: req.userId!,
            isAccepted: true,
            members: {
              createMany: {
                data: [
                  { userId: req.userId!, role: 'owner' },
                  ...body.participantIds.map((id: string) => ({ userId: id, role: 'member' as const })),
                ],
              },
            },
          },
          select: { id: true },
        });
        conversationId = conversation.id;
      }

      // Send initial message if provided
      if (body.initialMessage) {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: req.userId!,
            content: body.initialMessage,
            contentType: 'text',
          },
        });
      }

      sendCreated(res, { conversationId });
    } catch (err) { next(err); }
  },
);

// GET /api/conversations/:conversationId/messages
conversationsRouter.get(
  '/:conversationId/messages',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cursor, limit } = z
        .object({ cursor: z.string().optional(), limit: z.coerce.number().int().max(50).optional() })
        .parse(req.query);

      // Verify membership
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: req.params['conversationId']!,
            userId: req.userId!,
          },
        },
      });

      if (!member) throw forbiddenError('Not a member of this conversation');

      const cursorDate = cursor ? new Date(Buffer.from(cursor, 'base64').toString()) : undefined;

      const messages = await prisma.message.findMany({
        where: {
          conversationId: req.params['conversationId']!,
          deletedAt: null,
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: 'desc' },
        take: (limit ?? 30) + 1,
      });

      const hasMore = messages.length > (limit ?? 30);
      const items = hasMore ? messages.slice(0, limit ?? 30) : messages;

      sendSuccess(res, {
        data: items.reverse(), // Chronological order
        pagination: {
          hasMore,
          nextCursor: hasMore
            ? Buffer.from(items[0]!.createdAt.toISOString()).toString('base64')
            : null,
          prevCursor: null,
        },
      });
    } catch (err) { next(err); }
  },
);

// POST /api/conversations/:conversationId/messages
conversationsRouter.post(
  '/:conversationId/messages',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = sendMessageSchema.parse(req.body);

      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: req.params['conversationId']!,
            userId: req.userId!,
          },
        },
      });

      if (!member) throw forbiddenError('Not a member of this conversation');

      const message = await prisma.message.create({
        data: {
          conversationId: req.params['conversationId']!,
          senderId: req.userId!,
          content: body.content,
          contentType: 'text',
          replyToId: body.replyToId ?? null,
          ...(body.mediaIds?.length
            ? {
                media: {
                  create: body.mediaIds.map((mediaId: string, order: number) => ({ mediaId, order })),
                },
              }
            : {}),
        },
        select: MESSAGE_SELECT,
      });

      // Update conversation updatedAt
      await prisma.conversation.update({
        where: { id: req.params['conversationId']! },
        data: { updatedAt: new Date(), lastMessageId: message.id },
      });

      // Mark read for sender
      await prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: req.params['conversationId']!,
            userId: req.userId!,
          },
        },
        data: { lastReadAt: new Date(), lastReadMessageId: message.id },
      });

      sendCreated(res, { message });
    } catch (err) { next(err); }
  },
);

// POST /api/conversations/:conversationId/read
conversationsRouter.post(
  '/:conversationId/read',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { messageId } = z.object({ messageId: z.string() }).parse(req.body);

      await prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: req.params['conversationId']!,
            userId: req.userId!,
          },
        },
        data: { lastReadAt: new Date(), lastReadMessageId: messageId },
      });

      await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId, userId: req.userId! } },
        update: {},
        create: { messageId, userId: req.userId! },
      });

      sendNoContent(res);
    } catch (err) { next(err); }
  },
);
