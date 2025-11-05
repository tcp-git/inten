const { RateLimitError } = require('./errors');

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - Unique identifier (IP address, user ID, etc.)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} - True if within limit, false otherwise
   */
  isWithinLimit(key, maxRequests, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const userRequests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Update the requests array
    this.requests.set(key, validRequests);

    // Check if within limit
    if (validRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    return true;
  }

  /**
   * Get remaining requests for a key
   * @param {string} key - Unique identifier
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} - Rate limit info
   */
  getRateLimitInfo(key, maxRequests, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      return {
        remaining: maxRequests,
        resetTime: now + windowMs,
        total: maxRequests,
      };
    }

    const userRequests = this.requests.get(key);
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    return {
      remaining: Math.max(0, maxRequests - validRequests.length),
      resetTime: validRequests.length > 0 ? validRequests[0] + windowMs : now + windowMs,
      total: maxRequests,
    };
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < maxAge);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * Clear all rate limit data
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 * @param {object} options - Rate limiting options
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {string} options.keyGenerator - Function to generate rate limit key (default: IP address)
 * @param {string} options.message - Error message when rate limit exceeded
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    message = 'Too many requests, please try again later',
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    
    if (!rateLimiter.isWithinLimit(key, maxRequests, windowMs)) {
      const rateLimitInfo = rateLimiter.getRateLimitInfo(key, maxRequests, windowMs);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000));
      
      const error = new RateLimitError(message);
      error.details = {
        limit: maxRequests,
        remaining: rateLimitInfo.remaining,
        resetTime: new Date(rateLimitInfo.resetTime).toISOString(),
      };
      
      return next(error);
    }

    // Add rate limit info to headers
    const rateLimitInfo = rateLimiter.getRateLimitInfo(key, maxRequests, windowMs);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000));

    next();
  };
};

// Predefined rate limiters for common use cases
const apiRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many API requests, please try again later',
});

const searchRateLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many search requests, please try again later',
});

const strictRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  message: 'Rate limit exceeded, please slow down',
});

module.exports = {
  RateLimiter,
  rateLimiter,
  createRateLimiter,
  apiRateLimiter,
  searchRateLimiter,
  strictRateLimiter,
};