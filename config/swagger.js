const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Property Search Backend API',
      version: '1.0.0',
      description: `
        An AI-powered property search backend system that enables intelligent property discovery 
        through natural language queries, semantic search, and location-based filtering.
        
        ## Features
        - Natural language property search with AI intent detection
        - Semantic similarity search using vector embeddings
        - Geospatial location-based filtering
        - Traditional text and filter-based search
        - Property CRUD operations
        - Similar property recommendations
        
        ## Authentication
        Currently, all endpoints are public. In production, authentication should be implemented 
        for property management operations (Create, Update, Delete).
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        // Error response schemas
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './routes/*.js',
    './config/swagger-schemas.js',
    './server.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
};