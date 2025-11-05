const request = require('supertest');
const express = require('express');
const { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AIServiceError,
  RateLimitError 
} = require('../../middleware/errors');
const requestIdMiddleware = require('../../middleware/requestId');

describe('Error Handling Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(requestIdMiddleware);
  });

  describe('Custom Error Classes', () => {
    test('ValidationError should have correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    test('NotFoundError should have correct properties', () => {
      const error = new NotFoundError('Property');
      
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Property not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    test('DatabaseError should have correct properties', () => {
      const error = new DatabaseError('Connection failed', { host: 'localhost' });
      
      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.details).toEqual({ host: 'localhost' });
    });

    test('AIServiceError should have correct properties', () => {
      const error = new AIServiceError('Service unavailable');
      
      expect(error.name).toBe('AIServiceError');
      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('AI_SERVICE_ERROR');
    });

    test('RateLimitError should have correct properties', () => {
      const error = new RateLimitError('Too many requests');
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Error Handler Middleware', () => {

    test('should handle ValidationError correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new ValidationError('Invalid email format', [
          { field: 'email', message: 'Must be valid email' }
        ]);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          details: [{ field: 'email', message: 'Must be valid email' }],
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should handle NotFoundError correctly', async () => {
      app.get('/test', (req, res, next) => {
        next(new NotFoundError('Property'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Property not found',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should handle DatabaseError correctly', async () => {
      app.get('/test', (req, res, next) => {
        next(new DatabaseError('Connection timeout'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Connection timeout',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should handle generic Error correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Something went wrong');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: expect.any(String),
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should handle MongoDB CastError correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Cast to ObjectId failed');
        error.name = 'CastError';
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ID format',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should handle MongoDB duplicate key error correctly', async () => {
      app.get('/test', (req, res, next) => {
        const error = new Error('Duplicate key error');
        error.code = 11000;
        error.keyPattern = { email: 1 };
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'email already exists',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('Not Found Handler', () => {
    beforeEach(() => {
      app.use('*', notFoundHandler);
      app.use(errorHandler);
    });

    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          details: {
            path: '/non-existent-route',
            method: 'GET'
          },
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('Async Handler', () => {

    test('should catch async errors correctly', async () => {
      app.get('/test', asyncHandler(async (req, res, next) => {
        throw new ValidationError('Async validation error');
      }));
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Async validation error',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    test('should handle async promise rejections', async () => {
      app.get('/test', asyncHandler(async (req, res, next) => {
        await Promise.reject(new DatabaseError('Async database error'));
      }));
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Async database error',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('Request ID Integration', () => {

    test('should include request ID in error responses', async () => {
      app.get('/test', (req, res, next) => {
        next(new ValidationError('Test error'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body.error.requestId).toMatch(/^req_/);
      expect(response.headers['x-request-id']).toMatch(/^req_/);
    });
  });
});