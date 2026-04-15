// ═══════════════════════════════════════════════════════════════════════════════
// USERS ROUTER
// /api/users/* endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../../shared/middleware/auth';
import { updateUserSchema } from '../../shared/validation';
import { sendSuccess, sendNoContent } from '../../shared/response';
import * as usersService from './users.service';

export const usersRouter: Router = Router();

// GET /api/users/search
usersRouter.get(
  '/search',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, limit } = z
        .object({ query: z.string().min(1).max(50), limit: z.coerce.number().int().max(20).optional() })
        .parse(req.query);

      const users = await usersService.searchUsers(query, limit ?? 10, req.userId);
      sendSuccess(res, { users });
    } catch (err) { next(err); }
  },
);

// GET /api/users/:username
usersRouter.get(
  '/:username',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await usersService.getUserByUsername(req.params['username']!, req.userId);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// PATCH /api/users/me
usersRouter.patch(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await usersService.updateProfile(req.userId!, data);
      sendSuccess(res, { user });
    } catch (err) { next(err); }
  },
);

// GET /api/users/:username/followers
usersRouter.get(
  '/:username/followers',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, cursor } = z
        .object({ limit: z.coerce.number().int().max(50).optional(), cursor: z.string().optional() })
        .parse(req.query);

      const user = await usersService.getUserByUsername(req.params['username']!);
      const result = await usersService.getFollowers(user.user.id, limit ?? 20, cursor);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// GET /api/users/:username/following
usersRouter.get(
  '/:username/following',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, cursor } = z
        .object({ limit: z.coerce.number().int().max(50).optional(), cursor: z.string().optional() })
        .parse(req.query);

      const user = await usersService.getUserByUsername(req.params['username']!);
      const result = await usersService.getFollowing(user.user.id, limit ?? 20, cursor);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// POST /api/users/:username/follow
usersRouter.post(
  '/:username/follow',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = await usersService.getUserByUsername(req.params['username']!);
      const result = await usersService.followUser(req.userId!, user.id);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// DELETE /api/users/:username/follow
usersRouter.delete(
  '/:username/follow',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = await usersService.getUserByUsername(req.params['username']!);
      await usersService.unfollowUser(req.userId!, user.id);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);

// POST /api/users/:username/block
usersRouter.post(
  '/:username/block',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = await usersService.getUserByUsername(req.params['username']!);
      const { reason } = z.object({ reason: z.string().max(200).optional() }).parse(req.body);
      await usersService.blockUser(req.userId!, user.id, reason);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);

// DELETE /api/users/:username/block
usersRouter.delete(
  '/:username/block',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = await usersService.getUserByUsername(req.params['username']!);
      await usersService.unblockUser(req.userId!, user.id);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);

// POST /api/users/:username/mute
usersRouter.post(
  '/:username/mute',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = await usersService.getUserByUsername(req.params['username']!);
      const opts = z
        .object({
          muteReposts: z.boolean().optional(),
          muteNotifications: z.boolean().optional(),
          expiresAt: z.string().datetime().optional(),
        })
        .parse(req.body);

      await usersService.muteUser(req.userId!, user.id, {
        ...opts,
        expiresAt: opts.expiresAt ? new Date(opts.expiresAt) : undefined,
      });
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);

// DELETE /api/users/:username/mute
usersRouter.delete(
  '/:username/mute',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user } = await usersService.getUserByUsername(req.params['username']!);
      await usersService.unmuteUser(req.userId!, user.id);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);
