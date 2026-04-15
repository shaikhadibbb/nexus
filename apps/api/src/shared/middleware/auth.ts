// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// JWT verification and user context injection
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@nexus/database';
import type { UserSession } from '@nexus/shared-types';
import { authError, forbiddenError } from './error-handler';
import { createLogger } from '../logger';
import { config } from '../../config';

const logger = createLogger('auth');

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
      userId?: string;
    }
  }
}

interface JWTPayload extends UserSession {
  iat: number;
  exp: number;
}

/**
 * Verifies JWT access token and attaches user to request.
 * Returns 401 if missing or invalid.
 */
export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(authError('Missing authentication token'));
    }

    const token = authHeader.slice(7);
    if (!token) return next(authError('Missing authentication token'));

    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // Verify session still exists in DB
    const session = await prisma.session.findFirst({
      where: {
        userId: payload.userId,
        id: payload.sessionId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return next(authError('Session expired or invalid'));
    }

    // Fire-and-forget: update last used time
    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch((err: unknown) => logger.warn({ err }, 'Failed to update session lastUsedAt'));

    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      username: payload.username,
      email: payload.email,
      accountType: payload.accountType,
      isVerified: payload.isVerified,
    };
    req.userId = payload.userId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(authError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(authError('Invalid token'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional auth — attaches user if a valid token is present, continues otherwise.
 */
export const optionalAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.slice(7);
    if (!token) return next();

    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      username: payload.username,
      email: payload.email,
      accountType: payload.accountType,
      isVerified: payload.isVerified,
    };
    req.userId = payload.userId;

    next();
  } catch {
    // Silently ignore errors — optional auth
    next();
  }
};

/**
 * Requires specific account types.
 */
export function requireAccountType(...types: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(authError());
    if (!types.includes(req.user.accountType)) {
      return next(forbiddenError('Account type not permitted for this action'));
    }
    next();
  };
}

/**
 * Requires verified account badge.
 */
export const requireVerified: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user) return next(authError());
  if (!req.user.isVerified) return next(forbiddenError('Verified account required'));
  next();
};
