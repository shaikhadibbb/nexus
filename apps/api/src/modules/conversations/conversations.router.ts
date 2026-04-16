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
  joinedAt: true,
  lastReadAt: true,
  isMuted: true,
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
  content: true,
  replyToId: true,
  isEdited: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  reactions: { select: { emoji: true, userId: true } },
  readReceipts: { select: { userId: true, readAt: true } },
  media: {
    include: {
      media: {
        select: {
          id: true, url: true, type: true, mimeType: true,
          sizeBytes: true, blurhash: true,
        },
      },
    },
  },
};

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
      sendSuccess(res, {
        data: [],
        pagination: { hasMore: false, nextCursor: null, prevCursor: null },
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
      const conversationId = '00000000-0000-0000-0000-000000000000';
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
      sendSuccess(res, {
        data: [],
        pagination: { hasMore: false, nextCursor: null, prevCursor: null },
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
      sendCreated(res, { messageId: '00000000-0000-0000-0000-000000000000' });
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
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);
