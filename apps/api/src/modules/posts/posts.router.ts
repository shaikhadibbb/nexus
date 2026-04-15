// ═══════════════════════════════════════════════════════════════════════════════
// POSTS ROUTER
// /api/posts/* endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../shared/middleware/auth';
import { createPostSchema, updatePostSchema } from '../../shared/validation';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response';
import * as postsService from './posts.service';

export const postsRouter: Router = Router();

// POST /api/posts
postsRouter.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createPostSchema.parse(req.body);
      const post = await postsService.createPost(req.userId!, body);
      sendCreated(res, { post });
    } catch (err) { next(err); }
  },
);

// GET /api/posts/:postId
postsRouter.get(
  '/:postId',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await postsService.getPost(req.params['postId']!, req.userId);
      sendSuccess(res, { post });
    } catch (err) { next(err); }
  },
);

// GET /api/posts/:postId/thread
postsRouter.get(
  '/:postId/thread',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = await postsService.getThreadContext(req.params['postId']!, req.userId);
      sendSuccess(res, context);
    } catch (err) { next(err); }
  },
);

// PATCH /api/posts/:postId
postsRouter.patch(
  '/:postId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updatePostSchema.parse(req.body);
      const post = await postsService.updatePost(req.params['postId']!, req.userId!, data);
      sendSuccess(res, { post });
    } catch (err) { next(err); }
  },
);

// DELETE /api/posts/:postId
postsRouter.delete(
  '/:postId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await postsService.deletePost(req.params['postId']!, req.userId!);
      sendNoContent(res);
    } catch (err) { next(err); }
  },
);

// POST /api/posts/:postId/like
postsRouter.post(
  '/:postId/like',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await postsService.likePost(req.params['postId']!, req.userId!);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// DELETE /api/posts/:postId/like
postsRouter.delete(
  '/:postId/like',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await postsService.unlikePost(req.params['postId']!, req.userId!);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// POST /api/posts/:postId/bookmark
postsRouter.post(
  '/:postId/bookmark',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await postsService.bookmarkPost(req.params['postId']!, req.userId!);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// DELETE /api/posts/:postId/bookmark
postsRouter.delete(
  '/:postId/bookmark',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await postsService.unbookmarkPost(req.params['postId']!, req.userId!);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);
