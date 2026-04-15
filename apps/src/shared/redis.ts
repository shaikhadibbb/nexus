// ═══════════════════════════════════════════════════════════════════════════════
// REDIS CLIENT
// Configured for caching, sessions, rate limiting, and pub/sub
// ═══════════════════════════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('redis');

/**
 * Creates a configured Redis client with reconnection handling
 */
export function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000); // Exponential backoff, max 3 seconds
    },
    lazyConnect: true,
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Redis error');
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return client;
}

/**
 * Creates a separate Redis client for pub/sub
 * Pub/sub clients can't be used for regular commands
 */
export function createRedisPubSubClient(): { pub: Redis; sub: Redis } {
  const pub = createRedisClient();
  const sub = createRedisClient();
  
  return { pub, sub };
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(client: Redis): Promise<boolean> {
  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Cache helper with automatic serialization
 */
export class Cache {
  constructor(private readonly client: Redis) {}

  /**
   * Get a cached value, with optional JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Set a cached value with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiry on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }
}
