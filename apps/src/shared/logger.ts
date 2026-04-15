// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING UTILITY
// Pino-based structured logging with request context
// ═══════════════════════════════════════════════════════════════════════════════

import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Base logger configuration
 * Uses JSON in production, pretty-print in development
 */
const baseLogger = pino({
  level: LOG_LEVEL,
  transport: IS_PRODUCTION
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    service: 'nexus-api',
  },
});

/**
 * Creates a child logger with a specific module context
 * Useful for tracing logs back to their source
 */
export function createLogger(module: string): pino.Logger {
  return baseLogger.child({ module });
}

/**
 * Creates a request-scoped logger with request ID
 * Used in middleware to trace requests through the system
 */
export function createRequestLogger(requestId: string, module?: string): pino.Logger {
  return baseLogger.child({
    requestId,
    ...(module && { module }),
  });
}

export { baseLogger as logger };
