const express = require('express');
const cors = require('cors');
require('dotenv').config();

const database = require('./config/database');
const { specs, swaggerUi } = require('./config/swagger');

// Import middleware
const logger = require('./middleware/logger');
const requestIdMiddleware = require('./middleware/requestId');
const requestLoggerMiddleware = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errors');
const { apiRateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Request logging middleware
app.use(requestLoggerMiddleware);

// Rate limiting middleware
app.use('/api', apiRateLimiter);

// Basic middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      const error = new Error('Invalid JSON payload');
      error.statusCode = 400;
      error.code = 'INVALID_JSON';
      throw error;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Import routes
const propertyRoutes = require('./routes/propertyRoutes');
const healthRoutes = require('./routes/healthRoutes');

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Property Search API Documentation',
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      req.headers['X-Requested-With'] = 'SwaggerUI';
      return req;
    }
  }
}));

// API routes
app.use('/api/properties', propertyRoutes);

// Health check routes
app.use('/health', healthRoutes);

/**
 * @swagger
 * tags:
 *   name: General
 *   description: General API information and utilities
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: API welcome message
 *     description: Welcome endpoint providing basic API information and links to documentation.
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Welcome message with API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Welcome to AI Property Search Backend API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 documentation:
 *                   type: string
 *                   example: "/api/docs"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     properties:
 *                       type: string
 *                       example: "/api/properties"
 *                     search:
 *                       type: string
 *                       example: "/api/properties/search"
 *                     health:
 *                       type: string
 *                       example: "/health"
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AI Property Search Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      properties: '/api/properties',
      search: '/api/properties/search',
      health: '/health'
    }
  });
});

// 404 handler for undefined routes
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Setup database event listeners
    database.setupEventListeners();
    
    // Try to connect to database (non-blocking)
    database.connect().catch(_error => {
      console.warn(
        '⚠️  Database connection failed during startup, but server will continue running'
      );
      console.warn(
        '🔄 Database will continue attempting to reconnect in the background'
      );
    });
    
    // Start the server regardless of database connection status
    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/health`,
        detailedHealth: `http://localhost:${PORT}/health/detailed`,
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info('Graceful shutdown initiated', { signal });
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await database.disconnect();
          logger.info('Graceful shutdown completed successfully');
          // eslint-disable-next-line no-process-exit
          process.exit(0);
        } catch (shutdownError) {
          logger.error('Error during shutdown', { error: shutdownError.message });
          // eslint-disable-next-line no-process-exit
          process.exit(1);
        }
      });

      // Force close server after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (startupError) {
    logger.error('Failed to start server', { error: startupError.message, stack: startupError.stack });
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

// Start server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
