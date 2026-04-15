// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// Helmet, CORS, CSRF prevention, and secure defaults
// ═══════════════════════════════════════════════════════════════════════════════

import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';
import { corsOrigins, config } from '../../config';
import { createLogger } from '../logger';

const logger = createLogger('security');

// ─────────────────────────────────────────────────────────────────────────────
// Helmet security headers
// ─────────────────────────────────────────────────────────────────────────────

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: config.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman in dev)
    if (!origin) {
      if (config.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Origin required in production'), false);
    }

    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn({ origin }, 'Blocked CORS request from unknown origin');
    callback(new Error(`CORS: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24h preflight cache
});

// ─────────────────────────────────────────────────────────────────────────────
// Request ID injection
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const requestId: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Webhook signature verification helper (Stripe)
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'crypto';

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  try {
    // Stripe webhook format: t=<timestamp>,v1=<sig>
    const parts = signature.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const sig = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !sig) return false;

    const signedPayload = `${timestamp}.${payload.toString()}`;
    const expected = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
