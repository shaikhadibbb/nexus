// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS API SERVER ENTRY POINT
// Express server with Socket.io, GraphQL, and modular architecture
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';
import { createYoga } from 'graphql-yoga';
import { prisma, checkDatabaseHealth, disconnectDatabase } from '@nexus/database';
import { createLogger } from './shared/logger';
import { createRedisClient, checkRedisHealth } from './shared/redis';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler';
import { requestLogger } from './shared/middleware/request-logger';
import { securityHeaders } from './shared/middleware/security';
import { createRateLimiter } from './shared/middleware/rate-limiter';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { postsRouter } from './modules/posts/posts.router';
import { feedRouter } from './modules/feed/feed.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { conversationsRouter } from './modules/conversations/conversations.router';
import { mediaRouter } from './modules/media/media.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { setupSocketHandlers } from './modules/realtime/socket.handler';
import { schema } from './graphql/schema';

const logger = createLogger('server');

async function bootstrap(): Promise<void> {
  const app = express();
  const httpServer = createServer(app);
  
  // Environment configuration
  const PORT = parseInt(process.env.API_PORT || '4000', 10);
  const HOST = process.env.API_HOST || '0.0.0.0';
  const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['[localhost](http://localhost:3000)'];
  
  // Initialize Redis
  const redis = createRedisClient();
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Core Middleware
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Security headers (before other middleware)
  app.use(helmet({
    contentSecurityPolicy: false, // Handled by nginx in production
    crossOriginEmbedderPolicy: false,
  }));
  app.use(securityHeaders);
  
  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  }));
  
  // Compression
  app.use(compression());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  
  // Request logging
  app.use(requestLogger);
  
  // Rate limiting
  const globalLimiter = createRateLimiter(redis, {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyPrefix: 'rl:global:',
  });
  app.use(globalLimiter);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Health Check Endpoints
  // ─────────────────────────────────────────────────────────────────────────────
  
  app.get('/health', async (_req, res) => {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth(redis);
    
    const status = dbHealthy && redisHealthy ? 'healthy' : 'unhealthy';
    const statusCode = status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
    });
  });
  
  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'alive' });
  });
  
  app.get('/health/ready', async (_req, res) => {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth(redis);
    
    if (dbHealthy && redisHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // REST API Routes
  // ─────────────────────────────────────────────────────────────────────────────
  
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/posts', postsRouter);
  app.use('/feed', feedRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/conversations', conversationsRouter);
  app.use('/media', mediaRouter);
  app.use('/payments', paymentsRouter);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // GraphQL Endpoint
  // ─────────────────────────────────────────────────────────────────────────────
  
  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    context: async ({ request }) => {
      // Extract auth token from header
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      return {
        prisma,
        redis,
        token,
      };
    },
    maskedErrors: process.env.NODE_ENV === 'production',
    logging: {
      debug: (...args) => logger.debug(args),
      info: (...args) => logger.info(args),
      warn: (...args) => logger.warn(args),
      error: (...args) => logger.error(args),
    },
  });
  
  app.use('/graphql', yoga);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Socket.io Setup
  // ─────────────────────────────────────────────────────────────────────────────
  
  const io = new SocketServer(httpServer, {
    cors: {
      origin: CORS_ORIGINS,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  
  setupSocketHandlers(io, redis);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────
  
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Server Startup
  // ─────────────────────────────────────────────────────────────────────────────
  
  httpServer.listen(PORT, HOST, () => {
    logger.info(`🚀 Nexus API server running at http://${HOST}:${PORT}`);
    logger.info(`   GraphQL endpoint: http://${HOST}:${PORT}/graphql`);
    logger.info(`   WebSocket enabled`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Graceful Shutdown
  // ─────────────────────────────────────────────────────────────────────────────
  
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    // Stop accepting new connections
    httpServer.close(async () => {
      logger.info('HTTP server closed');
      
      // Close Socket.io connections
      io.close(() => {
        logger.info('Socket.io server closed');
      });
      
      // Close database connection
      await disconnectDatabase();
      logger.info('Database connection closed');
      
      // Close Redis connection
      await redis.quit();
      logger.info('Redis connection closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
