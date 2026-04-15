// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CLIENT
// Singleton Prisma client with connection pooling and logging
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance
 * Uses singleton pattern to prevent multiple connections in development
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client configuration
 * - Query logging in development
 * - Error logging in all environments
 * - Connection pooling via DATABASE_URL params
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

// Prevent multiple instances in development hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Ensures database connections are properly closed
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Database health check
 * Used by health check endpoints and container orchestration
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Re-export Prisma types for convenience
export * from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
