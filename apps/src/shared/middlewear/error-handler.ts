// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING MIDDLEWARE
// Centralized error handling with structured responses
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@nexus/database';
import { createLogger } from '../logger';
import type { ApiError, ErrorCode } from '@nexus/shared-types';

const logger = createLogger('error-handler');

/**
 * Custom application error with structured data
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error factory
 */
export function validationError(details: Record<string, string[]>): AppError {
  return new AppError('Validation failed', 'VALIDATION_ERROR', 400, details);
}

/**
 * Not found error factory
 */
export function notFoundError(resource: string): AppError {
  return new AppError(`${resource} not found`, 'NOT_FOUND', 404);
}

/**
 * Authentication error factory
 */
export function authError(message = 'Authentication required'): AppError {
  return new AppError(message, 'AUTHENTICATION_ERROR', 401);
}

/**
 * Authorization error factory
 */
export function forbiddenError(message = 'Access denied'): AppError {
  return new AppError(message, 'AUTHORIZATION_ERROR', 403);
}

/**
 * Conflict error factory (e.g., duplicate username)
 */
export function conflictError(message: string): AppError {
  return new AppError(message, 'CONFLICT', 409);
}

/**
 * Rate limit error factory
 */
export function rateLimitError(message = 'Too many requests'): AppError {
  return new AppError(message, 'RATE_LIMITED', 429);
}

/**
 * Converts ZodError to structured validation error format
 */
function formatZodError(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  
  for (const issue of error.errors) {
    const path = issue.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }
  
  return details;
}

/**
 * Maps Prisma errors to application errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return conflictError(`A record with this ${target} already exists`);
    }
    case 'P2025':
      // Record not found
      return notFoundError('Record');
    case 'P2003':
      // Foreign key constraint violation
      return new AppError('Related record not found', 'VALIDATION_ERROR', 400);
    default:
      logger.error({ error }, 'Unhandled Prisma error');
      return new AppError('Database operation failed', 'INTERNAL_ERROR', 500);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log all errors
  const requestId = req.headers['x-request-id'] as string;
  
  // Determine error type and format response
  let appError: AppError;
  
  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = validationError(formatZodError(err));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError('Invalid data provided', 'VALIDATION_ERROR', 400);
  } else {
    // Unknown error - treat as internal error
    logger.error({ 
      err, 
      requestId,
      path: req.path,
      method: req.method,
    }, 'Unhandled error');
    
    appError = new AppError('Internal server error', 'INTERNAL_ERROR', 500);
  }
  
  // Log operational errors at appropriate level
  if (appError.statusCode >= 500) {
    logger.error({ 
      error: appError,
      requestId,
      path: req.path,
    }, appError.message);
  } else if (appError.statusCode >= 400) {
    logger.warn({ 
      code: appError.code,
      requestId,
      path: req.path,
    }, appError.message);
  }
  
  // Build error response
  const errorResponse: { success: false; error: ApiError } = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details && { details: appError.details }),
      ...(process.env.NODE_ENV !== 'production' && { stack: appError.stack }),
    },
  };
  
  res.status(appError.statusCode).json(errorResponse);
}

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFoundError(`Route ${req.method} ${req.path} not found`));
};
