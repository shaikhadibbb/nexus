// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST LOGGER MIDDLEWARE
// Pino-http integration with request/response logging
// ═══════════════════════════════════════════════════════════════════════════════

import pinoHttp from 'pino-http';
import { rootLogger } from '../logger';

export const requestLogger = pinoHttp({
  logger: rootLogger,
  // Don't log health checks — they're noisy
  autoLogging: {
    ignore(req) {
      return req.url === '/health' || req.url === '/metrics';
    },
  },
  customLogLevel(_req, res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req, _res, err) {
    return `${req.method} ${req.url} — ${err.message}`;
  },
  customProps(req) {
    return {
      requestId: req.headers['x-request-id'],
      userId: (req as unknown as import('express').Request).userId,
    };
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
