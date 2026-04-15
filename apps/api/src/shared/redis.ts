// ═══════════════════════════════════════════════════════════════════════════════
// REDIS CLIENT SINGLETON
// ioredis client with retry logic and graceful shutdown
// ═══════════════════════════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('redis');

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (redisInstance) return redisInstance;

  const client = new Redis(config.REDIS_URL, {
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 10) {
        logger.error('Redis retry limit reached — giving up');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn({ attempt: times, delay }, 'Redis reconnecting...');
      return delay;
    },
    reconnectOnError(error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => error.message.includes(e));
    },
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('ready', () => logger.info('Redis ready'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  client.on('close', () => logger.warn('Redis connection closed'));
  client.on('reconnecting', () => logger.info('Redis reconnecting'));

  redisInstance = client;
  return client;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis connection closed gracefully');
  }
}

export { Redis };
