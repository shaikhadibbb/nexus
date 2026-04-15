// ═══════════════════════════════════════════════════════════════════════════════
// FEED ROUTER
// /api/feed/* endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../shared/middleware/auth';
import { feedParamsSchema } from '../../shared/validation';
import { sendSuccess } from '../../shared/response';
import * as feedService from './feed.service';

export const feedRouter: Router = Router();

// GET /api/feed — main feed endpoint (dispatches based on feedType param)
feedRouter.get(
  '/',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = feedParamsSchema.parse(req.query);

      let result;

      switch (params.feedType) {
        case 'following':
          if (!req.userId) {
            res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Login required for following feed' } });
            return;
          }
          result = await feedService.getFollowingFeed(req.userId, {
            cursor: params.cursor,
            limit: params.limit,
            includeReposts: params.includeReposts,
          });
          break;

        case 'trending':
          result = await feedService.getTrendingFeed({
            cursor: params.cursor,
            limit: params.limit,
          });
          break;

        case 'user':
          if (!params.userId) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'userId required for user feed' } });
            return;
          }
          result = await feedService.getUserFeed(params.userId, {
            cursor: params.cursor,
            limit: params.limit,
            includeReplies: params.includeReplies,
            mediaOnly: params.mediaOnly,
          });
          break;

        default: // 'home' and others
          if (!req.userId) {
            result = await feedService.getTrendingFeed({ cursor: params.cursor, limit: params.limit });
          } else {
            result = await feedService.getHomeFeed(req.userId, {
              cursor: params.cursor,
              limit: params.limit,
            });
          }
      }

      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

// GET /api/feed/trending/hashtags
feedRouter.get(
  '/trending/hashtags',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await feedService.getTrendingHashtags(
        10,
        (req.query['window'] as 'hour' | 'day' | 'week') ?? 'day',
      );
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);
