// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// Additional security headers and protections
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';

/**
 * Additional security headers not covered by Helmet
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent caching of sensitive data
  if (req.path.startsWith('/auth') || req.path.startsWith('/api/me')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  next();
}

/**
 * CSRF token validation for state-changing requests
 * Used in conjunction with cookie-based tokens
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for API routes that use Bearer tokens
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }
  
  // Validate CSRF token from header matches cookie
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.['csrf-token'];
  
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Invalid CSRF token',
      },
    });
    return;
  }
  
  next();
}
