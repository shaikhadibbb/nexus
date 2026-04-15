// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER MIDDLEWARE
// Converts all errors to standardized ApiResponse format
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '../logger';

const logger = createLogger('error-handler');

// ─────────────────────────────────────────────────────────────────────────────
// Custom application errors
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Shorthand factories
export function authError(message = 'Authentication required'): AppError {
  return new AppError(401, 'AUTHENTICATION_ERROR', message);
}

export function forbiddenError(message = 'Access denied'): AppError {
  return new AppError(403, 'AUTHORIZATION_ERROR', message);
}

export function notFoundError(resource = 'Resource'): AppError {
  return new AppError(404, 'NOT_FOUND', `${resource} not found`);
}

export function conflictError(message: string): AppError {
  return new AppError(409, 'CONFLICT', message);
}

export function validationError(message: string, details?: Record<string, string[]>): AppError {
  return new AppError(422, 'VALIDATION_ERROR', message, details);
}

export function paymentError(message: string): AppError {
  return new AppError(402, 'PAYMENT_REQUIRED', message);
}

export function rateLimitError(message = 'Too many requests'): AppError {
  return new AppError(429, 'RATE_LIMITED', message);
}

export function internalError(message = 'Internal server error'): AppError {
  return new AppError(500, 'INTERNAL_ERROR', message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Error handler middleware (must have 4 args for Express to treat as error handler)
// ─────────────────────────────────────────────────────────────────────────────

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Already responded
  if (res.headersSent) return;

  const isDev = process.env['NODE_ENV'] !== 'production';

  // Zod validation errors
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || 'root';
      if (!details[path]) details[path] = [];
      details[path]!.push(issue.message);
    }

    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
        ...(isDev ? { stack: error.stack } : {}),
      },
    });
    return;
  }

  // Known application errors
  if (error instanceof AppError) {
    logger.warn(
      { statusCode: error.statusCode, code: error.code, path: req.path },
      error.message,
    );

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(isDev ? { stack: error.stack } : {}),
      },
    });
    return;
  }

  // Prisma-style "not found" error
  if (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'P2025'
  ) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Record not found' },
    });
    return;
  }

  // Prisma unique constraint
  if (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'P2002'
  ) {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A record with these values already exists' },
    });
    return;
  }

  // Generic unknown error
  logger.error({ err: error, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(isDev && error instanceof Error
        ? { stack: error.stack, detail: error.message }
        : {}),
    },
  });
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
