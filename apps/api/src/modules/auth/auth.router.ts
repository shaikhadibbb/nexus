// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTER
// /api/auth/* endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema, refreshTokenSchema } from '../../shared/validation';
import { requireAuth } from '../../shared/middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/response';
import * as authService from './auth.service';

export const authRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

authRouter.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = registerSchema.parse(req.body);
      const result = await authService.register({
        ...body,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      sendCreated(res, {
        user: sanitizeUser(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login({
        ...body,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        user: sanitizeUser(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

authRouter.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshTokens(refreshToken);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

authRouter.post(
  '/logout',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.logout(req.user!.sessionId, req.user!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prisma } = await import('@nexus/database');
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.userId! },
      });
      sendSuccess(res, sanitizeUser(user));
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash, ...safe } = user;
  return safe;
}
