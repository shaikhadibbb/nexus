import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
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

export const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required').max(5000, 'Post is too long'),
  postType: z.enum(['text', 'media', 'poll', 'thread', 'quote', 'repost']).optional().default('text'),
  visibility: z
    .enum(['public', 'followers', 'subscribers', 'mentioned', 'private'])
    .optional()
    .default('public'),
  parentId: uuidSchema.nullable().optional(),
  quotedPostId: uuidSchema.nullable().optional(),
  mediaIds: z.array(uuidSchema).max(4).optional(),
  poll: z
    .object({
      options: z.array(z.string().min(1).max(100)).min(2).max(4),
      expiresIn: z.number().int().min(1).max(168),
      allowMultiple: z.boolean().optional().default(false),
      hideResultsUntilEnd: z.boolean().optional().default(false),
    })
    .nullable()
    .optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),
  locationName: z.string().max(100).nullable().optional(),
  sensitiveContent: z.boolean().optional().default(false),
  contentWarning: z.string().max(200).nullable().optional(),
  subscriberOnly: z.boolean().optional().default(false),
  requiredTierId: uuidSchema.nullable().optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  visibility: z.enum(['public', 'followers', 'subscribers', 'mentioned', 'private']).optional(),
  sensitiveContent: z.boolean().optional(),
  contentWarning: z.string().max(200).nullable().optional(),
});

export const feedParamsSchema = z.object({
  feedType: z
    .enum(['home', 'following', 'trending', 'explore', 'local', 'list', 'hashtag', 'user'])
    .optional()
    .default('home'),
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

export const createTipSchema = z.object({
  recipientId: uuidSchema,
  amount: z.number().int().min(100).max(100000),
  postId: uuidSchema.optional(),
  message: z.string().max(500).optional(),
});

export const createSubscriptionTierSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500),
  priceMonthly: z.number().int().min(100).max(10000),
  priceYearly: z.number().int().min(1000).max(100000).nullable().optional(),
  benefits: z.array(z.string().max(200)).max(10),
});

export const initUploadSchema = z.object({
  filename: z.string().max(255),
  mimeType: z.string().regex(/^(image|video|audio)\//),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
});

export const completeUploadSchema = z.object({
  uploadId: z.string(),
  mediaId: uuidSchema,
  altText: z.string().max(500).optional(),
});

export { createHeavyOperationLimiter } from './middleware/rate-limiter';
