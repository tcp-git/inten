const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const healthService = require('../services/healthService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health monitoring endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Check the basic health status of the API server and database connection.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
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
 *                   example: "AI Property Search Backend Health Check"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                   description: "Server uptime in seconds"
 *                 database:
 *                   type: object
 *                   properties:
 *                     healthy:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: "connected"
 *                     responseTime:
 *                       type: number
 *                       example: 15.2
 *                       description: "Database response time in milliseconds"
 *       503:
 *         description: System is unhealthy (database issues)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "AI Property Search Backend Health Check"
 *                 database:
 *                   type: object
 *                   properties:
 *                     healthy:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: string
 *                       example: "disconnected"
 *                     error:
 *                       type: string
 *                       example: "Connection timeout"
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthStatus = await healthService.getHealthStatus();
  const statusCode = healthStatus.database.healthy ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthStatus.database.healthy,
    message: 'AI Property Search Backend Health Check',
    ...healthStatus,
  });
}));

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: |
 *       Comprehensive health check including database connection, AI service availability,
 *       system resources, and performance metrics.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed system health information
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
 *                   example: "Detailed Health Check"
 *                 overall:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: "Server uptime in seconds"
 *                 database:
 *                   type: object
 *                   properties:
 *                     healthy:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                     responseTime:
 *                       type: number
 *                     collections:
 *                       type: object
 *                       properties:
 *                         properties:
 *                           type: integer
 *                           description: "Number of properties in database"
 *                 aiService:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     responseTime:
 *                       type: number
 *                       example: 250.5
 *                       description: "AI service response time in milliseconds"
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 *                 system:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           description: "Used memory in MB"
 *                         total:
 *                           type: number
 *                           description: "Total memory in MB"
 *                         percentage:
 *                           type: number
 *                           description: "Memory usage percentage"
 *                     cpu:
 *                       type: object
 *                       properties:
 *                         usage:
 *                           type: number
 *                           description: "CPU usage percentage"
 *       503:
 *         description: System has health issues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Detailed Health Check"
 *                 overall:
 *                   type: string
 *                   example: "unhealthy"
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Database connection failed", "AI service unavailable"]
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const detailedHealth = await healthService.getDetailedHealthCheck();
  const statusCode = detailedHealth.overall === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: detailedHealth.overall === 'healthy',
    message: 'Detailed Health Check',
    ...detailedHealth,
  });
}));

module.exports = router;