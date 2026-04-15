// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SERVICE
// Registration, login, token management, OAuth
// ═══════════════════════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@nexus/database';
import type { UserSession } from '@nexus/shared-types';
import { config } from '../../config';
import { createLogger } from '../../shared/logger';
import { getRedis } from '../../shared/redis';
import {
  authError,
  conflictError,
  notFoundError,
  internalError,
} from '../../shared/middleware/error-handler';

const logger = createLogger('auth-service');
const BCRYPT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Token generation
// ─────────────────────────────────────────────────────────────────────────────

function generateAccessToken(session: UserSession): string {
  return jwt.sign(session, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

function generateRefreshToken(): string {
  return uuidv4() + '-' + uuidv4();
}

function parseExpiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────────────────

export async function register(input: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const { email, username, displayName, password, userAgent, ipAddress } = input;

  // Check for existing email/username
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    if (existing.email === email) throw conflictError('Email already registered');
    throw conflictError('Username already taken');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash,
      status: 'active',
      accountType: 'personal',
    },
  });

  const { session, accessToken, refreshTokenValue, expiresAt } = await createSession(user.id, {
    userAgent,
    ipAddress,
    sessionId: uuidv4(),
    username: user.username,
    email: user.email,
    accountType: user.accountType,
    isVerified: user.isVerified,
  });

  logger.info({ userId: user.id, username: user.username }, 'User registered');

  return {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
    expiresAt,
    sessionId: session.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

export async function login(input: {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const { email, password, userAgent, ipAddress } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    // Timing-safe: always hash even on failure
    await bcrypt.hash(password, BCRYPT_ROUNDS);
    throw authError('Invalid email or password');
  }

  if (user.status === 'suspended') {
    throw authError('Account suspended');
  }

  if (user.status === 'deactivated') {
    throw authError('Account deactivated');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw authError('Invalid email or password');

  const { session, accessToken, refreshTokenValue, expiresAt } = await createSession(user.id, {
    userAgent,
    ipAddress,
    sessionId: uuidv4(),
    username: user.username,
    email: user.email,
    accountType: user.accountType,
    isVerified: user.isVerified,
  });

  logger.info({ userId: user.id }, 'User logged in');

  return {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
    expiresAt,
    sessionId: session.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh tokens
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshTokens(refreshTokenValue: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenValue },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw authError('Invalid or expired refresh token');
  }

  if (stored.usedAt) {
    // Token reuse detected — revoke all tokens for user (security measure)
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId },
      data: { revokedAt: new Date() },
    });
    logger.warn({ userId: stored.userId }, 'Refresh token reuse detected — all tokens revoked');
    throw authError('Token reuse detected. Please log in again.');
  }

  // Mark as used
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { usedAt: new Date() },
  });

  const { user } = stored;
  const { session, accessToken, refreshTokenValue: newRefreshToken, expiresAt } = await createSession(
    user.id,
    {
      sessionId: stored.sessionId,
      username: user.username,
      email: user.email,
      accountType: user.accountType,
      isVerified: user.isVerified,
    },
  );

  return { accessToken, refreshToken: newRefreshToken, expiresAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

export async function logout(sessionId: string, userId: string): Promise<void> {
  await Promise.all([
    prisma.session.deleteMany({ where: { id: sessionId, userId } }),
    prisma.refreshToken.updateMany({
      where: { sessionId, userId },
      data: { revokedAt: new Date() },
    }),
  ]);

  // Invalidate any cached user state in Redis
  const redis = getRedis();
  await redis.del(`user:session:${sessionId}`).catch(() => null);

  logger.info({ userId, sessionId }, 'User logged out');
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: create session + tokens
// ─────────────────────────────────────────────────────────────────────────────

async function createSession(
  userId: string,
  sessionData: {
    sessionId: string;
    username: string;
    email: string;
    accountType: string;
    isVerified: boolean;
    userAgent?: string;
    ipAddress?: string;
  },
) {
  const { sessionId, username, email, accountType, isVerified, userAgent, ipAddress } = sessionData;

  const refreshExpiryMs = parseExpiryToMs(config.JWT_REFRESH_EXPIRY);
  const refreshExpiresAt = new Date(Date.now() + refreshExpiryMs);
  const sessionExpiresAt = new Date(Date.now() + refreshExpiryMs);

  const userSession: UserSession = {
    userId,
    sessionId,
    username,
    email,
    accountType: accountType as UserSession['accountType'],
    isVerified,
  };

  const accessToken = generateAccessToken(userSession);
  const refreshTokenValue = generateRefreshToken();

  const [session] = await prisma.$transaction([
    prisma.session.upsert({
      where: { id: sessionId },
      update: { lastUsedAt: new Date(), expiresAt: sessionExpiresAt },
      create: {
        id: sessionId,
        userId,
        userAgent,
        ipAddress,
        expiresAt: sessionExpiresAt,
      },
    }),
    prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        sessionId,
        expiresAt: refreshExpiresAt,
      },
    }),
  ]);

  if (!session) throw internalError('Failed to create session');

  return {
    session,
    accessToken,
    refreshTokenValue,
    expiresAt: sessionExpiresAt,
  };
}
