// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// Zod schemas shared across modules for request validation
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────────
// Common Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─────────────────────────────────────────────────────────────────────────────────
// Auth Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address').max(255);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name is too long');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─────────────────────────────────────────────────────────────────────────────────
// User Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: z.string().max(500).nullable().optional(),
  website: z.string().url().max(200).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  isPrivate: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  allowDMs: z.enum(['everyone', 'followers', 'none']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  focusModeEnabled: z.boolean().optional(),
  scrollVelocityLimit: z.number().int().positive().nullable().optional(),
  contentWarningsEnabled: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────────
// Post Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const postContentSchema = z
  .string()
  .min(1, 'Post content is required')
  .max(5000, 'Post is too long');

export const createPostSchema = z.object({
  content: postContentSchema,
  postType: z.enum(['text', 'media', 'poll', 'thread', 'quote', 'repost']).optional().default('text'),
  visibility: z.enum(['public', 'followers', 'subscribers', 'mentioned', 'private']).optional().default('public'),
  parentId: uuidSchema.nullable().optional(),
  quotedPostId: uuidSchema.nullable().optional(),
  mediaIds: z.array(uuidSchema).max(4).optional(),
  poll: z.object({
    options: z.array(z.string().min(1).max(100)).min(2).max(4),
    expiresIn: z.number().int().min(1).max(168), // 1 hour to 7 days
    allowMultiple: z.boolean().optional().default(false),
    hideResultsUntilEnd: z.boolean().optional().default(false),
  }).nullable().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).nullable().optional(),
  locationName: z.string().max(100).nullable().optional(),
  sensitiveContent: z.boolean().optional().default(false),
  contentWarning: z.string().max(200).nullable().optional(),
  subscriberOnly: z.boolean().optional().default(false),
  requiredTierId: uuidSchema.nullable().optional(),
});

export const updatePostSchema = z.object({
  content: postContentSchema.optional(),
  visibility: z.enum(['public', 'followers', 'subscribers', 'mentioned', 'private']).optional(),
  sensitiveContent: z.boolean().optional(),
  contentWarning: z.string().max(200).nullable().optional(),
});

export const reportPostSchema = z.object({
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'misinformation',
    'copyright',
    'adult_content',
    'self_harm',
    'other',
  ]),
  details: z.string().max(1000).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────────
// Feed Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const feedParamsSchema = z.object({
  feedType: z.enum(['home', 'following', 'trending', 'explore', 'local', 'list', 'hashtag', 'user']).optional().default('home'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  listId: uuidSchema.optional(),
  hashtag: z.string().optional(),
  userId: uuidSchema.optional(),
  includeReplies: z.coerce.boolean().optional().default(false),
  includeReposts: z.coerce.boolean().optional().default(true),
  mediaOnly: z.coerce.boolean().optional().default(false),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional().default(50),
});

// ─────────────────────────────────────────────────────────────────────────────────
// Message Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  participantIds: z.array(uuidSchema).min(1).max(10),
  isGroup: z.boolean().optional().default(false),
  groupName: z.string().max(100).optional(),
  initialMessage: z.string().max(5000).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaIds: z.array(uuidSchema).max(4).optional(),
  replyToId: uuidSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────────
// Payment Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const createTipSchema = z.object({
  recipientId: uuidSchema,
  amount: z.number().int().min(100).max(100000), // $1 to $1000
  postId: uuidSchema.optional(),
  message: z.string().max(500).optional(),
});

export const createSubscriptionTierSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500),
  priceMonthly: z.number().int().min(100).max(10000), // $1 to $100/month
  priceYearly: z.number().int().min(1000).max(100000).nullable().optional(),
  benefits: z.array(z.string().max(200)).max(10),
});

// ─────────────────────────────────────────────────────────────────────────────────
// Media Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const initUploadSchema = z.object({
  filename: z.string().max(255),
  mimeType: z.string().regex(/^(image|video|audio)\//),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024), // 100MB max
});

export const completeUploadSchema = z.object({
  uploadId: z.string(),
  mediaId: uuidSchema,
  altText: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────────
// List Schemas
// ─────────────────────────────────────────────────────────────────────────────────

export const createListSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  isPrivate: z.boolean().optional().default(false),
  memberIds: z.array(uuidSchema).max(500).optional(),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  isPrivate: z.boolean().optional(),
});
