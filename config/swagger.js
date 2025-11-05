const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Property Search Backend API',
      version: '1.0.0',
      description: `
        # AI Property Search Backend API

        An AI-powered property search backend system that enables intelligent property discovery 
        through natural language queries, semantic search, and location-based filtering.
        
        ## 🚀 Features
        - **Natural Language Search**: AI-powered intent detection for Thai and English queries
        - **Semantic Search**: Vector embeddings for meaning-based property matching
        - **Geospatial Search**: Location-based filtering with distance calculations
        - **Traditional Search**: Text and filter-based search capabilities
        - **Property Management**: Full CRUD operations for property listings
        - **Similar Properties**: AI-powered property recommendations
        - **Performance Monitoring**: Health checks and system metrics
        
        ## 🔧 Technology Stack
        - **Backend**: Node.js with Express.js framework
        - **Database**: MongoDB Atlas with geospatial indexing
        - **AI Engine**: FastAPI with Sentence-BERT models
        - **Search**: Text indexing, vector similarity, and geospatial queries
        
        ## 📊 API Usage Guidelines
        
        ### Rate Limiting
        - API endpoints are rate-limited to prevent abuse
        - Current limit: 100 requests per 15 minutes per IP
        
        ### Response Format
        All API responses follow a consistent format:
        - **Success**: \`{ "success": true, "data": {...} }\`
        - **Error**: \`{ "success": false, "error": {...} }\`
        
        ### Search Performance
        - Natural language queries: ~1-2 seconds (includes AI processing)
        - Filter-based queries: ~100-500ms
        - Geospatial queries: ~200-800ms
        
        ### Error Handling
        - All errors include descriptive messages and error codes
        - Request IDs are provided for debugging
        - Fallback mechanisms ensure service availability
        
        ## 🔐 Authentication
        Currently, all endpoints are public for development. In production:
        - Property management operations (Create, Update, Delete) should require authentication
        - Consider implementing API keys for external integrations
        - Rate limiting should be user-specific rather than IP-based
        
        ## 🌐 Deployment
        - **Development**: http://localhost:3000
        - **Documentation**: Available at \`/api/docs\`
        - **Health Check**: Available at \`/health\`
      `,
      termsOfService: 'https://example.com/terms',
      contact: {
        name: 'API Support Team',
        email: 'api-support@example.com',
        url: 'https://example.com/support',
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    externalDocs: {
      description: 'Find more information about the AI Property Search system',
      url: 'https://github.com/example/ai-property-search-backend',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.example.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authenticated requests (future implementation)',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations (future implementation)',
        },
      },
      parameters: {
        PropertyId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{24}$',
          },
          description: 'MongoDB ObjectId of the property',
          example: '507f1f77bcf86cd799439011',
        },
        PageParam: {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number for pagination',
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items per page',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationErrorResponse',
              },
              examples: {
                validationError: {
                  summary: 'Validation Error',
                  value: {
                    success: false,
                    error: {
                      code: 'VALIDATION_ERROR',
                      message: 'Invalid input data',
                      details: [
                        {
                          field: 'price',
                          message: 'Price must be a positive number',
                          value: -1000,
                        },
                      ],
                      timestamp: '2024-01-15T10:30:00.000Z',
                      requestId: 'req_123456789',
                    },
                  },
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                propertyNotFound: {
                  summary: 'Property Not Found',
                  value: {
                    success: false,
                    error: {
                      code: 'PROPERTY_NOT_FOUND',
                      message: 'Property with the specified ID was not found',
                      timestamp: '2024-01-15T10:30:00.000Z',
                      requestId: 'req_123456789',
                    },
                  },
                },
              },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                rateLimitError: {
                  summary: 'Rate Limit Exceeded',
                  value: {
                    success: false,
                    error: {
                      code: 'RATE_LIMIT_EXCEEDED',
                      message: 'Too many requests. Please try again later.',
                      timestamp: '2024-01-15T10:30:00.000Z',
                      requestId: 'req_123456789',
                    },
                  },
                },
              },
            },
          },
          headers: {
            'X-RateLimit-Limit': {
              description: 'Request limit per time window',
              schema: {
                type: 'integer',
              },
            },
            'X-RateLimit-Remaining': {
              description: 'Remaining requests in current window',
              schema: {
                type: 'integer',
              },
            },
            'X-RateLimit-Reset': {
              description: 'Time when rate limit resets (Unix timestamp)',
              schema: {
                type: 'integer',
              },
            },
          },
        },
        ServiceUnavailable: {
          description: 'Service temporarily unavailable',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                aiServiceDown: {
                  summary: 'AI Service Unavailable',
                  value: {
                    success: false,
                    error: {
                      code: 'AI_SERVICE_UNAVAILABLE',
                      message: 'AI service is temporarily unavailable. Falling back to keyword search.',
                      timestamp: '2024-01-15T10:30:00.000Z',
                      requestId: 'req_123456789',
                    },
                  },
                },
                databaseDown: {
                  summary: 'Database Unavailable',
                  value: {
                    success: false,
                    error: {
                      code: 'DATABASE_UNAVAILABLE',
                      message: 'Database connection failed. Please try again later.',
                      timestamp: '2024-01-15T10:30:00.000Z',
                      requestId: 'req_123456789',
                    },
                  },
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                serverError: {
                  summary: 'Internal Server Error',
                  value: {
                    success: false,
                    error: {
                      code: 'INTERNAL_SERVER_ERROR',
                      message: 'An unexpected error occurred. Please try again later.',
                      timestamp: '2024-01-15T10:30:00.000Z',
                      requestId: 'req_123456789',
                    },
                  },
                },
              },
            },
          },
        },
      },
      examples: {
        ThaiSearchQuery: {
          summary: 'Thai Language Search',
          description: 'Natural language search in Thai',
          value: {
            query: 'บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน มีที่จอดรถ',
            pagination: {
              page: 1,
              limit: 20,
            },
            sortBy: 'relevance',
          },
        },
        EnglishSearchQuery: {
          summary: 'English Language Search',
          description: 'Natural language search in English',
          value: {
            query: 'modern house near school under 2 million with parking',
            pagination: {
              page: 1,
              limit: 20,
            },
            sortBy: 'relevance',
          },
        },
        LocationBasedSearch: {
          summary: 'Location-Based Search',
          description: 'Search with specific location and radius',
          value: {
            query: 'condo with swimming pool',
            location: {
              coordinates: [100.5018, 13.7563],
              radius: 5,
            },
            filters: {
              propertyType: ['condo'],
              minPrice: 2000000,
              maxPrice: 5000000,
            },
            pagination: {
              page: 1,
              limit: 10,
            },
            sortBy: 'distance',
          },
        },
      },
    },
    tags: [
      {
        name: 'General',
        description: 'General API information and utilities',
      },
      {
        name: 'Properties',
        description: 'Property management and search operations',
        externalDocs: {
          description: 'Property management guide',
          url: 'https://docs.example.com/properties',
        },
      },
      {
        name: 'Health',
        description: 'System health monitoring and diagnostics',
        externalDocs: {
          description: 'Monitoring guide',
          url: 'https://docs.example.com/monitoring',
        },
      },
    ],
  },
  apis: [
    './routes/*.js',
    './config/swagger-schemas.js',
    './config/swagger-examples.js',
    './server.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
};