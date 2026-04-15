// ═══════════════════════════════════════════════════════════════════════════════
// COMMON TYPE DEFINITIONS
// Base types used across the entire application
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * Cursor-based pagination response metadata
 * Preferred for infinite scroll feeds where items can be inserted/deleted
 */
export interface CursorPaginationMeta {
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  totalCount?: number;
}

/**
 * Offset-based pagination response metadata
 * Used for admin dashboards and fixed-position lists
 */
export interface OffsetPaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: CursorPaginationMeta | OffsetPaginationMeta;
}

/**
 * Standard API response wrapper for consistent error handling
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

/**
 * Structured API error format
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, string[]>;
  stack?: string; // Only in development
}

/**
 * Standardized error codes for client handling
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'CONTENT_MODERATION_FAILED'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_FAILED';

/**
 * Sort direction for queries
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Generic sort parameters
 */
export interface SortParams<T extends string = string> {
  field: T;
  direction: SortDirection;
}

/**
 * Date range filter
 */
export interface DateRange {
  from?: Date | string;
  to?: Date | string;
}

/**
 * Geographic coordinates for location-based features
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Geographic bounding box for area queries
 */
export interface GeoBoundingBox {
  northEast: GeoPoint;
  southWest: GeoPoint;
}

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Soft-deletable entity extension
 */
export interface SoftDeletable {
  deletedAt: Date | string | null;
}

/**
 * Entity with version for optimistic locking
 */
export interface Versioned {
  version: number;
}

/**
 * Extract non-nullable type
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Make specific fields required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific fields optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
