// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS API SERVER — ENTRY POINT
// Express + Socket.io + Apollo GraphQL with graceful shutdown
// ═══════════════════════════════════════════════════════════════════════════════

import 'express-async-errors';
import './env';
import express from 'express';
import http from 'http';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { json, urlencoded } from 'express';

import { config } from './config';
import { createLogger } from './shared/logger';
import { getRedis, closeRedis } from './shared/redis';
import { prisma } from '@nexus/database';

// Middleware
import { requestLogger } from './shared/middleware/request-logger';
import { helmetMiddleware, corsMiddleware, requestId } from './shared/middleware/security';
import { createApiRateLimiter, createAuthRateLimiter } from './shared/middleware/rate-limiter';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler';

// Routers
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { postsRouter } from './modules/posts/posts.router';
import { feedRouter } from './modules/feed/feed.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { conversationsRouter } from './modules/conversations/conversations.router';
import { mediaRouter } from './modules/media/media.router';
import { paymentsRouter } from './modules/payments/payments.router';

// Realtime
import { createRealtimeServer, setSocketServer } from './modules/realtime/realtime.server';

// GraphQL
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import type { GraphQLContext } from './graphql/resolvers';

const logger = createLogger('server');

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);
  const redis = getRedis();

  // ── Trust proxy (for X-Forwarded-For behind Nginx) ──────────────────────
  app.set('trust proxy', 1);

  // ── Core middleware ───────────────────────────────────────────────────────
  app.use(requestId);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(requestLogger);

  // Raw body capture for Stripe webhooks (must be before json())
  app.use('/api/payments/webhook', (req, _res, next) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.concat(chunks);
      next();
    });
  });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const apiLimiter = createApiRateLimiter(redis);
  const authLimiter = createAuthRateLimiter(redis);

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);

  // ── REST Routes ───────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/feed', feedRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/payments', paymentsRouter);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    try {
      await Promise.all([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
      ]);
      res.json({
        status: 'healthy',
        version: process.env['npm_package_version'] ?? '1.0.0',
        timestamp: new Date().toISOString(),
        services: { database: 'ok', redis: 'ok' },
      });
    } catch (err) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ── GraphQL ───────────────────────────────────────────────────────────────
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apolloServer = new ApolloServer<GraphQLContext>({
    schema,
    introspection: config.NODE_ENV !== 'production',
    formatError: (formattedError, error) => {
      logger.warn({ error }, 'GraphQL error');
      if (config.NODE_ENV === 'production') {
        const { extensions } = formattedError;
        const code = extensions?.['code'] as string | undefined;
        if (code === 'INTERNAL_SERVER_ERROR') {
          return { message: 'Internal server error', extensions: { code } };
        }
      }
      return formattedError;
    },
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    corsMiddleware,
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<GraphQLContext> => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return {};

        try {
          const jwt = await import('jsonwebtoken');
          const token = authHeader.slice(7);
          const payload = jwt.default.verify(token, config.JWT_SECRET) as { userId: string };
          return { userId: payload.userId, token };
        } catch {
          return {};
        }
      },
    }),
  );

  // ── 404 + Error handlers (must be last) ──────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ── Socket.io realtime ────────────────────────────────────────────────────
  const io = createRealtimeServer(httpServer);
  setSocketServer(io);

  // ── Start server ──────────────────────────────────────────────────────────
  httpServer.listen(config.API_PORT, config.API_HOST, () => {
    logger.info(
      {
        port: config.API_PORT,
        host: config.API_HOST,
        env: config.NODE_ENV,
      },
      `🚀 Nexus API running at http://${config.API_HOST}:${config.API_PORT}`,
    );
    logger.info(`📊 GraphQL:   http://${config.API_HOST}:${config.API_PORT}/graphql`);
    logger.info(`❤️  Health:    http://${config.API_HOST}:${config.API_PORT}/health`);
    logger.info(`🔌 WebSocket: ws://${config.API_HOST}:${config.API_PORT}/socket.io`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    // Stop accepting new connections
    httpServer.close(async () => {
      logger.info('HTTP server closed');
    });

    io.close(() => {
      logger.info('Socket.io server closed');
    });

    try {
      await Promise.allSettled([
        apolloServer.stop(),
        prisma.$disconnect(),
        closeRedis(),
      ]);
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
