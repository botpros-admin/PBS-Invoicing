/**
 * Rate Limiting Middleware for API Protection
 * Prevents abuse and ensures fair usage of API endpoints
 */

import { logger } from '../lib/logger';
import { errorHandler, ErrorCategory } from '../lib/errorHandler';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  handler?: (req: any, res: any) => void;
}

interface RateLimitStore {
  hits: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  createLimiter(config: RateLimitConfig) {
    const {
      windowMs,
      maxRequests,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = this.defaultKeyGenerator,
      handler = this.defaultHandler,
    } = config;

    return async (req: any, res: any, next: () => void) => {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit data for this key
      let limitData = this.store.get(key);
      
      if (!limitData || limitData.resetTime < now) {
        // Create new window
        limitData = {
          hits: 0,
          resetTime: now + windowMs,
        };
        this.store.set(key, limitData);
      }

      // Increment hit count
      limitData.hits++;

      // Check if limit exceeded
      if (limitData.hits > maxRequests) {
        logger.warn('Rate limit exceeded', {
          component: 'RateLimiter',
          metadata: {
            key,
            hits: limitData.hits,
            maxRequests,
            resetTime: new Date(limitData.resetTime).toISOString(),
          },
        });

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - limitData.hits));
        res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());
        res.setHeader('Retry-After', Math.ceil((limitData.resetTime - now) / 1000));

        // Call custom handler
        handler(req, res);
        return;
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - limitData.hits));
      res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());

      // Continue to next middleware
      next();

      // Handle skip options after response
      if (res.statusCode < 400 && skipSuccessfulRequests) {
        limitData.hits--;
      } else if (res.statusCode >= 400 && skipFailedRequests) {
        limitData.hits--;
      }
    };
  }

  private defaultKeyGenerator(req: any): string {
    // Use IP address as default key
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || 'unknown';
    return `${req.method}:${req.url}:${ip}`;
  }

  private defaultHandler(req: any, res: any) {
    const error = errorHandler.createApiError(
      'Too many requests, please try again later',
      429,
      ErrorCategory.NETWORK,
      { retryAfter: res.getHeader('Retry-After') }
    );

    res.status(429).json({
      error: error.message,
      retryAfter: res.getHeader('Retry-After'),
    });
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Pre-configured rate limiters for different use cases

// General API rate limiter (100 requests per minute)
export const apiRateLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

// Strict rate limiter for authentication endpoints (5 requests per minute)
export const authRateLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  skipSuccessfulRequests: true,
});

// Payment endpoint rate limiter (10 requests per minute)
export const paymentRateLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => {
    // Rate limit per user for payment endpoints
    const userId = req.user?.id || 'anonymous';
    return `payment:${userId}`;
  },
});

// File upload rate limiter (5 uploads per minute)
export const uploadRateLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return `upload:${userId}`;
  },
});

// Export rate limiter (2 exports per minute)
export const exportRateLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 2,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return `export:${userId}`;
  },
});

// Search rate limiter (30 searches per minute)
export const searchRateLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

// Create custom rate limiter
export function createRateLimiter(config: RateLimitConfig) {
  return rateLimiter.createLimiter(config);
}

// Middleware for Next.js API routes
export function withRateLimit(
  handler: any,
  config?: Partial<RateLimitConfig>
) {
  const limiter = rateLimiter.createLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    ...config,
  });

  return async (req: any, res: any) => {
    return new Promise((resolve) => {
      limiter(req, res, async () => {
        const result = await handler(req, res);
        resolve(result);
      });
    });
  };
}

export default rateLimiter;