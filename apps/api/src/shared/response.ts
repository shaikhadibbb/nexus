// ═══════════════════════════════════════════════════════════════════════════════
// STANDARDIZED API RESPONSE HELPERS
// Consistent response shape across all endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { Response } from 'express';
import type { ApiResponse, ApiError, ErrorCode, CursorPaginationMeta } from '@nexus/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Response senders
// ─────────────────────────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiResponse<T> = { success: true, data, ...(meta ? { meta } : {}) };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: CursorPaginationMeta,
  meta?: Record<string, unknown>,
): void {
  sendSuccess(res, { data, pagination }, 200, meta);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, string[]>,
): void {
  const error: ApiError = {
    code,
    message,
    ...(details ? { details } : {}),
    ...(process.env['NODE_ENV'] !== 'production' && details
      ? { details }
      : {}),
  };

  const body: ApiResponse<never> = { success: false, error };
  res.status(statusCode).json(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cursor pagination helper
// ─────────────────────────────────────────────────────────────────────────────

export function buildCursorMeta(
  items: { id: string }[],
  limit: number,
  totalCount?: number,
): CursorPaginationMeta {
  const hasMore = items.length === limit;
  const lastItem = items[items.length - 1];
  return {
    hasMore,
    nextCursor: hasMore && lastItem ? Buffer.from(lastItem.id).toString('base64') : null,
    prevCursor: null,
    ...(totalCount !== undefined ? { totalCount } : {}),
  };
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}

export function encodeCursor(value: string): string {
  return Buffer.from(value).toString('base64');
}
