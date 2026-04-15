// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CLIENT SINGLETON
// Prisma client with production-safe connection management
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __nexusPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });
}

// Singleton pattern — prevents multiple instances in development hot-reload
export const prisma: PrismaClient =
  globalThis.__nexusPrisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__nexusPrisma = prisma;
}

export default prisma;

// Re-export Prisma types for convenience
export * from '@prisma/client';
