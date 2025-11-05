const request = require('supertest');
const app = require('../server');

describe('Server Setup', () => {
  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Welcome to AI Property Search Backend API');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      // Health endpoint returns 503 when database is not connected (expected in test environment)
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('AI Property Search Backend Health Check');
      expect(response.body.environment).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.database).toBeDefined();
      expect(response.body.database.connected).toBe(false);
      expect(response.body.uptime).toBeDefined();
    });

    it('should return detailed health status', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Detailed Health Check');
      expect(response.body.overall).toBe('degraded');
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBe(false);
      expect(response.body.checks.memory).toBeDefined();
      expect(response.body.checks.uptime).toBeDefined();
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Endpoint not found');
    });
  });
});