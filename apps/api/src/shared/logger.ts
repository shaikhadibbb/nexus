// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGER
// Pino-based logger with request context support
// ═══════════════════════════════════════════════════════════════════════════════

import pino from 'pino';
import { config } from '../config';

const transport =
  config.NODE_ENV !== 'production'
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      })
    : undefined;

export const rootLogger = pino(
  {
    level: config.LOG_LEVEL,
    base: {
      env: config.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      censor: '[REDACTED]',
    },
  },
  transport,
);

/**
 * Creates a child logger with a module name binding.
 * Use this in every module for structured context.
 */
export function createLogger(module: string): pino.Logger {
  return rootLogger.child({ module });
}

export type Logger = pino.Logger;
