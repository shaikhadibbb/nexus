// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING MIDDLEWARE
// Redis-backed sliding window rate limiter
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction, RequestHandler } from 'express';
import type Redis from 'ioredis';
import { createLogger } from '../logger';

const logger = createLogger('rate-limiter');

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Redis sliding window rate limiter — accurate and distributed-system safe.
 */
export function createRateLimiter(redis: Redis, options: RateLimiterOptions): RequestHandler {
  const { windowMs, max, keyPrefix, keyGenerator = (req) => req.ip ?? 'unknown', handler } =
    options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}${keyGenerator(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired entries
      pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add current timestamp
      pipeline.zcard(key); // Count in window
      pipeline.pexpire(key, windowMs); // Auto-cleanup

      const results = await pipeline.exec();
      const count = (results?.[2]?.[1] as number) ?? 0;

      const remaining = Math.max(0, max - count);
      const resetTime = Math.ceil((now + windowMs) / 1000);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (count > max) {
        logger.warn({ key, count, max }, 'Rate limit exceeded');
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));

        if (handler) {
          handler(req, res);
        } else {
          res.status(429).json({
            success: false,
            error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
          });
        }
        return;
      }

      next();
    } catch (error) {
      // Fail open on Redis error — don't block users due to infra issues
      logger.error({ error, key }, 'Rate limiter Redis error — failing open');
      next();
    }
  };
}

export function createAuthRateLimiter(redis: Redis): RequestHandler {
  return createRateLimiter(redis, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyPrefix: 'rl:auth:',
    keyGenerator: (req) => `${req.ip ?? 'unknown'}:${(req.body as Record<string, unknown>)?.email ?? ''}`,
  });
}

export function createApiRateLimiter(redis: Redis): RequestHandler {
  return createRateLimiter(redis, {
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    keyPrefix: 'rl:api:',
  });
}

export function createHeavyOperationLimiter(redis: Redis): RequestHandler {
  return createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    keyPrefix: 'rl:heavy:',
  });
}
