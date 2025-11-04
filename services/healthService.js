const database = require('../config/database');

class HealthService {
  async getHealthStatus() {
    const dbStatus = database.getConnectionStatus();
    const startTime = process.hrtime();
    
    // Test database connectivity
    let dbHealthy = false;
    let dbResponseTime = null;
    
    try {
      if (dbStatus.isConnected) {
        const mongoose = require('mongoose');
        await mongoose.connection.db.admin().ping();
        const endTime = process.hrtime(startTime);
        dbResponseTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
        dbHealthy = true;
      }
    } catch (error) {
      console.error('Database health check failed:', error.message);
    }

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: {
        connected: dbStatus.isConnected,
        healthy: dbHealthy,
        responseTime: dbResponseTime ? `${dbResponseTime}ms` : null,
        host: dbStatus.host,
        port: dbStatus.port,
        name: dbStatus.name,
        readyState: this.getReadyStateText(dbStatus.readyState),
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      },
    };
  }

  getReadyStateText(readyState) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[readyState] || 'unknown';
  }

  async getDetailedHealthCheck() {
    const basicHealth = await this.getHealthStatus();
    
    // Additional checks can be added here
    const checks = {
      database: basicHealth.database.healthy,
      memory: basicHealth.memory.used < 500, // Less than 500MB
      uptime: basicHealth.uptime > 0,
    };

    const allHealthy = Object.values(checks).every(check => check === true);

    return {
      ...basicHealth,
      overall: allHealthy ? 'healthy' : 'degraded',
      checks,
    };
  }
}

module.exports = new HealthService();