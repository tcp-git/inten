const logger = require('./logger');

/**
 * Custom error classes for different types of application errors
 */

class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode();
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  getDefaultCode() {
    return 'GENERIC_ERROR';
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class AIServiceError extends AppError {
  constructor(message = 'AI service unavailable', details = null) {
    super(message, 503, 'AI_SERVICE_ERROR', details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error', details = null) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Error handling middleware
 * Processes all errors and returns consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set default error properties if not an AppError
  if (!(err instanceof AppError)) {
    // Handle specific error types
    if (err.name === 'ValidationError') {
      err = new ValidationError(err.message, err.errors);
    } else if (err.name === 'CastError') {
      err = new ValidationError('Invalid ID format');
    } else if (err.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      err = new ConflictError(`${field} already exists`);
    } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
      err = new DatabaseError('Database operation failed', {
        originalError: err.message,
      });
    } else {
      // Generic server error
      err = new AppError(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        500,
        'INTERNAL_SERVER_ERROR',
        process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
      );
    }
  }

  // Log error with request context
  const errorLog = {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    },
    timestamp: err.timestamp,
  };

  // Log based on error severity
  if (err.statusCode >= 500) {
    logger.error('Server error occurred', errorLog);
  } else if (err.statusCode >= 400) {
    logger.warn('Client error occurred', errorLog);
  } else {
    logger.info('Error handled', errorLog);
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
      timestamp: err.timestamp,
      requestId: req.requestId,
    },
  };

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Send error response
  res.status(err.statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent endpoints
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Endpoint');
  error.details = {
    path: req.originalUrl,
    method: req.method,
  };
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch and forward errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  AIServiceError,
  RateLimitError,
  ExternalServiceError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
};