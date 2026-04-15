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
 * Verifies JWT access token and attaches user to request
 * Requires valid token - returns 401 if missing or invalid
 */
export const requireAuth: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw authError('Missing authentication token');
    }
    
    const token = authHeader.slice(7);
    
    if (!token) {
      throw authError('Missing authentication token');
    }
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      throw new Error('Server configuration error');
    }
    
    // Verify token
    const payload = jwt.verify(token, secret) as JWTPayload;
    
    // Check if session still exists
    const session = await prisma.session.findFirst({
      where: {
        userId: payload.userId,
        id: payload.sessionId,
        expiresAt: { gt: new Date() },
      },
    });
    
    if (!session) {
      throw authError('Session expired or invalid');
    }
    
    // Update last used timestamp (non-blocking)
    prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    }).catch((error) => {
      logger.warn({ error }, 'Failed to update session last used');
    });
    
    // Attach user to request
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
 * Optional authentication - attaches user if token present, continues otherwise
 */
export const optionalAuth: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.slice(7);
    
    if (!token) {
      return next();
    }
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next();
    }
    
    const payload = jwt.verify(token, secret) as JWTPayload;
    
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
    // Ignore errors - this is optional auth
    next();
  }
};

/**
 * Requires specific account types
 */
export function requireAccountType(...types: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(authError());
    }
    
    if (!types.includes(req.user.accountType)) {
      return next(forbiddenError('Account type not permitted for this action'));
    }
    
    next();
  };
}

/**
 * Requires verified account
 */
export const requireVerified: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(authError());
  }
  
  if (!req.user.isVerified) {
    return next(forbiddenError('Verified account required'));
  }
  
  next();
};
