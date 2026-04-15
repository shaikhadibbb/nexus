// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING MIDDLEWARE
// Redis-backed sliding window rate limiter
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction, RequestHandler } from 'express';
import Redis from 'ioredis';
import { createLogger } from '../logger';

const logger = createLogger('rate-limiter');

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Creates a Redis-backed sliding window rate limiter
 * More accurate than fixed window and handles distributed systems
 */
export function createRateLimiter(redis: Redis, options: RateLimiterOptions): RequestHandler {
  const {
    windowMs,
    max,
    keyPrefix,
    keyGenerator = (req) => req.ip || 'unknown',
    handler,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}${keyGenerator(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis transaction for atomic operations
      const pipeline = redis.pipeline();
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Add current request timestamp
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Count requests in window
      pipeline.zcard(key);
      
      // Set expiry to clean up old keys
      pipeline.pexpire(key, windowMs);
      
      const results = await pipeline.exec();
      
      // Get count from zcard result (third command, index 2)
      const countResult = results?.[2];
      const count = (countResult?.[1] as number) || 0;
      
      // Set rate limit headers
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
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests, please try again later',
            },
          });
        }
        return;
      }
      
      next();
    } catch (error) {
      // On Redis error, allow the request but log
      logger.error({ error, key }, 'Rate limiter error');
      next();
    }
  };
}

/**
 * Creates a stricter rate limiter for authentication endpoints
 */
export function createAuthRateLimiter(redis: Redis): RequestHandler {
  return createRateLimiter(redis, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    keyPrefix: 'rl:auth:',
    keyGenerator: (req) => {
      // Rate limit by IP + email to prevent enumeration
      const email = req.body?.email || '';
      const ip = req.ip || 'unknown';
      return `${ip}:${email}`;
    },
  });
}

/**
 * Creates a rate limiter for expensive operations (uploads, exports)
 */
export function createHeavyOperationLimiter(redis: Redis): RequestHandler {
  return createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 operations per hour
    keyPrefix: 'rl:heavy:',
  });
}
