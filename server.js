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
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b4151; }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; border-radius: 4px; }
    .swagger-ui .btn.authorize { background-color: #49cc90; border-color: #49cc90; }
    .swagger-ui .btn.authorize:hover { background-color: #41b883; border-color: #41b883; }
    .swagger-ui .highlight-code { background: #f8f8f8; }
    .swagger-ui .model-box { background: #f8f8f8; }
    .swagger-ui .response-col_status { font-weight: bold; }
    .swagger-ui .opblock.opblock-post { border-color: #49cc90; }
    .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #49cc90; }
    .swagger-ui .opblock.opblock-get { border-color: #61affe; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #61affe; }
    .swagger-ui .opblock.opblock-put { border-color: #fca130; }
    .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #fca130; }
    .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; }
    .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #f93e3e; }
  `,
  customSiteTitle: 'AI Property Search API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      req.headers['X-Requested-With'] = 'SwaggerUI';
      req.headers['X-API-Documentation'] = 'true';
      return req;
    },
    responseInterceptor: (res) => {
      // Log API calls made through Swagger UI for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Swagger UI API Call:', {
          url: res.url,
          status: res.status,
          duration: res.headers['x-response-time'] || 'N/A'
        });
      }
      return res;
    },
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 3,
    displayOperationId: false,
    displayRequestDuration: true,
    maxDisplayedTags: 10,
    showMutatedRequest: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null, // Disable online validator
    oauth2RedirectUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/docs/oauth2-redirect.html`,
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
