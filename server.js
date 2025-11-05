const express = require('express');
const cors = require('cors');
require('dotenv').config();

const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const healthService = require('./services/healthService');

// Import routes
const propertyRoutes = require('./routes/propertyRoutes');

// API routes
app.use('/api/properties', propertyRoutes);

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await healthService.getHealthStatus();
    const statusCode = healthStatus.database.healthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthStatus.database.healthy,
      message: 'AI Property Search Backend Health Check',
      ...healthStatus,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health check endpoint
app.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = await healthService.getDetailedHealthCheck();
    const statusCode = detailedHealth.overall === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: detailedHealth.overall === 'healthy',
      message: 'Detailed Health Check',
      ...detailedHealth,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AI Property Search Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.originalUrl,
    },
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

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
      // eslint-disable-next-line no-console
      console.log(`🚀 Server running on port ${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      // eslint-disable-next-line no-console
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      // eslint-disable-next-line no-console
      console.log(`🔗 Detailed health: http://localhost:${PORT}/health/detailed`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await database.disconnect();
          console.log('✅ Graceful shutdown completed');
          // eslint-disable-next-line no-process-exit
          process.exit(0);
        } catch (shutdownError) {
          console.error('❌ Error during shutdown:', shutdownError.message);
          // eslint-disable-next-line no-process-exit
          process.exit(1);
        }
      });

      // Force close server after 30 seconds
      setTimeout(() => {
        console.error('💥 Could not close connections in time, forcefully shutting down');
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (startupError) {
    console.error('💥 Failed to start server:', startupError.message);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

// Start server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
