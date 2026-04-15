// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME SERVER — Socket.io
// Namespaces, presence, typing indicators, live notifications
// ═══════════════════════════════════════════════════════════════════════════════

import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { createLogger } from '../../shared/logger';
import { getRedis } from '../../shared/redis';
import type { UserSession } from '@nexus/shared-types';

const logger = createLogger('realtime');

interface AuthenticatedSocket {
  userId: string;
  username: string;
  sessionId: string;
}

declare module 'socket.io' {
  interface Socket {
    nexusUser?: AuthenticatedSocket;
  }
}

const PRESENCE_TTL = 60; // seconds
const TYPING_TTL = 5; // seconds

export function createRealtimeServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Auth middleware — verify JWT on connection
  // ─────────────────────────────────────────────────────────────────────────

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth['token'] as string | undefined ??
        (socket.handshake.headers.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : undefined);

      if (!token) {
        // Allow anonymous connections (read-only presence)
        return next();
      }

      const payload = jwt.verify(token, config.JWT_SECRET) as UserSession & { iat: number; exp: number };

      socket.nexusUser = {
        userId: payload.userId,
        username: payload.username,
        sessionId: payload.sessionId,
      };

      next();
    } catch (err) {
      logger.warn({ err }, 'Socket auth failed');
      next(new Error('Authentication failed'));
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Connection handler
  // ─────────────────────────────────────────────────────────────────────────

  io.on('connection', async (socket) => {
    const user = socket.nexusUser;
    const redis = getRedis();

    logger.info(
      { socketId: socket.id, userId: user?.userId ?? 'anon' },
      'Socket connected',
    );

    // ── Authenticated user setup ──────────────────────────────────────────

    if (user) {
      // Join personal channel
      await socket.join(`user:${user.userId}`);

      // Set online presence in Redis
      await redis.setex(
        `presence:${user.userId}`,
        PRESENCE_TTL,
        JSON.stringify({ status: 'online', lastSeenAt: new Date().toISOString() }),
      );

      // Broadcast presence to followers (fan-out would use Redis pub/sub in production)
      socket.broadcast.emit('presence', {
        userId: user.userId,
        status: 'online',
        lastSeenAt: new Date(),
      });

      // Presence heartbeat (refresh TTL every 30s)
      const presenceInterval = setInterval(async () => {
        await redis
          .setex(
            `presence:${user.userId}`,
            PRESENCE_TTL,
            JSON.stringify({ status: 'online', lastSeenAt: new Date().toISOString() }),
          )
          .catch(() => null);
      }, 30000);

      // ── Event handlers ────────────────────────────────────────────────────

      // Subscribe to a channel (post, conversation, etc.)
      socket.on('subscribe', async (data: { channel: string; channelType: string }) => {
        if (!data.channel) return;

        // Basic authorization: users can only join their own channels
        if (data.channelType === 'user' && data.channel !== `user:${user.userId}`) return;

        await socket.join(data.channel);
        logger.debug({ channel: data.channel, userId: user.userId }, 'Subscribed to channel');
      });

      // Unsubscribe from channel
      socket.on('unsubscribe', async (data: { channel: string }) => {
        await socket.leave(data.channel);
      });

      // Typing start in conversation
      socket.on(
        'typing_start',
        async (data: { conversationId: string }) => {
          if (!data.conversationId) return;

          await redis.setex(
            `typing:${data.conversationId}:${user.userId}`,
            TYPING_TTL,
            JSON.stringify({ userId: user.userId, username: user.username, startedAt: new Date() }),
          );

          // Broadcast to conversation members
          socket.to(`conversation:${data.conversationId}`).emit('typing', {
            conversationId: data.conversationId,
            userId: user.userId,
            username: user.username,
            isTyping: true,
          });
        },
      );

      // Typing stop
      socket.on('typing_stop', async (data: { conversationId: string }) => {
        if (!data.conversationId) return;

        await redis.del(`typing:${data.conversationId}:${user.userId}`).catch(() => null);

        socket.to(`conversation:${data.conversationId}`).emit('typing', {
          conversationId: data.conversationId,
          userId: user.userId,
          username: user.username,
          isTyping: false,
        });
      });

      // Reading a post (ambient presence)
      socket.on('reading_post', (data: { postId: string }) => {
        if (!data.postId) return;
        socket.to(`post:${data.postId}`).emit('readers', {
          postId: data.postId,
          userId: user.userId,
          username: user.username,
        });
      });

      // ── Disconnect ────────────────────────────────────────────────────────

      socket.on('disconnect', async () => {
        clearInterval(presenceInterval);

        await redis
          .setex(
            `presence:${user.userId}`,
            3600, // Keep last-seen for 1 hour
            JSON.stringify({ status: 'offline', lastSeenAt: new Date().toISOString() }),
          )
          .catch(() => null);

        socket.broadcast.emit('presence', {
          userId: user.userId,
          status: 'offline',
          lastSeenAt: new Date(),
        });

        logger.info({ socketId: socket.id, userId: user.userId }, 'Socket disconnected');
      });
    } else {
      // Anonymous connection — limited to public event subscriptions
      socket.on('subscribe', async (data: { channel: string; channelType: string }) => {
        if (data.channelType === 'post' || data.channelType === 'feed') {
          await socket.join(data.channel);
        }
      });

      socket.on('disconnect', () => {
        logger.debug({ socketId: socket.id }, 'Anonymous socket disconnected');
      });
    }
  });

  logger.info('Socket.io realtime server initialized');
  return io;
}

// ─────────────────────────────────────────────────────────────────────────────
// Emitters — called by other services to push realtime events
// ─────────────────────────────────────────────────────────────────────────────

let _io: SocketServer | null = null;

export function setSocketServer(io: SocketServer): void {
  _io = io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  _io?.to(`user:${userId}`).emit(event, data);
}

export function emitToConversation(conversationId: string, event: string, data: unknown): void {
  _io?.to(`conversation:${conversationId}`).emit(event, data);
}

export function emitToPost(postId: string, event: string, data: unknown): void {
  _io?.to(`post:${postId}`).emit(event, data);
}

export function broadcastPostEngagement(postId: string, counts: {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  viewCount: number;
  momentumScore: number;
}): void {
  _io?.to(`post:${postId}`).emit('post_engagement', { postId, ...counts });
}

export function broadcastNewNotification(userId: string, notification: unknown): void {
  _io?.to(`user:${userId}`).emit('notification', notification);
}
