const request = require('supertest');
const app = require('../server');

describe('Swagger Documentation', () => {
  describe('GET /api/docs', () => {
    it('should redirect to Swagger UI documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(302);
      
      expect(response.headers.location).toBe('/api/docs/');
    });
  });

  describe('GET /api/docs/', () => {
    it('should serve Swagger UI HTML page', async () => {
      const response = await request(app)
        .get('/api/docs/')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('AI Property Search API Documentation');
    });
  });

  describe('API Documentation Content', () => {
    it('should include proper API information in welcome endpoint', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toMatchObject({
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
  });

  describe('OpenAPI Specification', () => {
    it('should serve OpenAPI JSON specification', async () => {
      // Test that swagger-jsdoc generates valid OpenAPI spec
      const { specs } = require('../config/swagger');
      
      expect(specs).toBeDefined();
      expect(specs.openapi).toBe('3.0.0');
      expect(specs.info).toBeDefined();
      expect(specs.info.title).toBe('AI Property Search Backend API');
      expect(specs.info.version).toBe('1.0.0');
      expect(specs.paths).toBeDefined();
      expect(specs.components).toBeDefined();
      expect(specs.components.schemas).toBeDefined();
    });

    it('should include all required schemas', async () => {
      const { specs } = require('../config/swagger');
      
      const requiredSchemas = [
        'Property',
        'CreatePropertyRequest',
        'UpdatePropertyRequest',
        'SearchRequest',
        'SearchResponse',
        'ErrorResponse',
        'ValidationErrorResponse',
        'SuccessResponse'
      ];

      requiredSchemas.forEach(schema => {
        expect(specs.components.schemas[schema]).toBeDefined();
      });
    });

    it('should include comprehensive error responses', async () => {
      const { specs } = require('../config/swagger');
      
      const errorResponse = specs.components.schemas.ErrorResponse;
      expect(errorResponse.properties.error.properties.code.enum).toContain('VALIDATION_ERROR');
      expect(errorResponse.properties.error.properties.code.enum).toContain('PROPERTY_NOT_FOUND');
      expect(errorResponse.properties.error.properties.code.enum).toContain('AI_SERVICE_UNAVAILABLE');
      expect(errorResponse.properties.error.properties.code.enum).toContain('RATE_LIMIT_EXCEEDED');
    });

    it('should include server configurations', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.servers).toBeDefined();
      expect(specs.servers.length).toBeGreaterThan(0);
      expect(specs.servers[0].url).toBeDefined();
      expect(specs.servers[0].description).toBeDefined();
    });

    it('should include security schemes for future authentication', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.components.securitySchemes).toBeDefined();
      expect(specs.components.securitySchemes.BearerAuth).toBeDefined();
      expect(specs.components.securitySchemes.ApiKeyAuth).toBeDefined();
    });

    it('should include reusable parameters', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.components.parameters).toBeDefined();
      expect(specs.components.parameters.PropertyId).toBeDefined();
      expect(specs.components.parameters.PageParam).toBeDefined();
      expect(specs.components.parameters.LimitParam).toBeDefined();
    });

    it('should include comprehensive response examples', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.components.responses).toBeDefined();
      expect(specs.components.responses.BadRequest).toBeDefined();
      expect(specs.components.responses.NotFound).toBeDefined();
      expect(specs.components.responses.RateLimitExceeded).toBeDefined();
      expect(specs.components.responses.ServiceUnavailable).toBeDefined();
    });

    it('should include API usage examples', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.components.examples).toBeDefined();
      expect(specs.components.examples.ThaiSearchQuery).toBeDefined();
      expect(specs.components.examples.EnglishSearchQuery).toBeDefined();
      expect(specs.components.examples.LocationBasedSearch).toBeDefined();
    });
  });

  describe('Documentation Quality', () => {
    it('should have comprehensive API description', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.info.description).toContain('AI-powered property search');
      expect(specs.info.description).toContain('Features');
      expect(specs.info.description).toContain('Technology Stack');
      expect(specs.info.description).toContain('Authentication');
    });

    it('should include external documentation links', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.externalDocs).toBeDefined();
      expect(specs.externalDocs.description).toBeDefined();
      expect(specs.externalDocs.url).toBeDefined();
    });

    it('should have proper contact information', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.info.contact).toBeDefined();
      expect(specs.info.contact.name).toBe('API Support Team');
      expect(specs.info.contact.email).toBeDefined();
      expect(specs.info.contact.url).toBeDefined();
    });

    it('should include license information', async () => {
      const { specs } = require('../config/swagger');
      
      expect(specs.info.license).toBeDefined();
      expect(specs.info.license.name).toBe('MIT License');
      expect(specs.info.license.url).toBeDefined();
    });
  });
});