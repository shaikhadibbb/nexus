// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST LOGGING MIDDLEWARE
// Logs all HTTP requests with timing and metadata
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger';

const logger = createLogger('http');

/**
 * Middleware that logs incoming requests and their responses
 * Adds request ID for tracing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Record start time
  const startTime = process.hrtime.bigint();
  
  // Log request
  const requestLog = {
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
  
  logger.info(requestLog, `→ ${req.method} ${req.path}`);
  
  // Log response on finish
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    const responseLog = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      contentLength: res.getHeader('content-length'),
    };
    
    // Choose log level based on status code
    if (res.statusCode >= 500) {
      logger.error(responseLog, `← ${res.statusCode} ${req.method} ${req.path}`);
    } else if (res.statusCode >= 400) {
      logger.warn(responseLog, `← ${res.statusCode} ${req.method} ${req.path}`);
    } else {
      logger.info(responseLog, `← ${res.statusCode} ${req.method} ${req.path}`);
    }
  });
  
  next();
}
