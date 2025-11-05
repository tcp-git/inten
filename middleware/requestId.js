const crypto = require('crypto');

/**
 * Middleware to generate and attach unique request ID to each request
 * The request ID is used for tracking requests across logs and error handling
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID using timestamp and random string
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  const requestId = `req_${timestamp}_${randomStr}`;
  
  // Attach request ID to request object
  req.requestId = requestId;
  
  // Add request ID to response headers for client tracking
  res.setHeader('X-Request-ID', requestId);
  
  // Continue to next middleware
  next();
};

module.exports = requestIdMiddleware;