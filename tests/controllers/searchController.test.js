const request = require('supertest');
const express = require('express');
const PropertyController = require('../../controllers/propertyController');
const { validateSearchProperties } = require('../../middleware/validation');

// Mock the PropertyService
jest.mock('../../services/propertyService');
const PropertyService = require('../../services/propertyService');

describe('PropertyController - Search Endpoint', () => {
  let app;
  let mockPropertyService;

  const sampleSearchResults = {
    properties: [
      {
        id: '507f1f77bcf86cd799439011',
        title: 'Modern Condo Near BTS',
        description: 'Luxury 2-bedroom condo with city view',
        price: 3500000,
        formattedPrice: '฿3,500,000',
        propertyType: 'condo',
        area: 85,
        pricePerSqm: 41176,
        rooms: { bedrooms: 2, bathrooms: 2 },
        location: {
          coordinates: [100.5412, 13.7563],
          address: '123 Sukhumvit Road, Bangkok',
          district: 'Watthana',
          province: 'Bangkok',
        },
        features: ['Swimming Pool', 'Gym', 'Security'],
        status: 'available',
        relevanceScore: 0.85,
        textScore: 1.2,
        distance: 2.5,
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalResults: 1,
      itemsPerPage: 20,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    searchMeta: {
      hasTextSearch: true,
      hasLocationSearch: true,
      appliedFilters: {
        propertyType: 'condo',
      },
      sortBy: 'relevance',
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    
    const propertyController = new PropertyController();
    app.post('/api/properties/search', validateSearchProperties, (req, res) => {
      propertyController.searchProperties(req, res);
    });

    // Setup mock
    mockPropertyService = PropertyService.prototype;
  });

  describe('POST /api/properties/search', () => {
    describe('successful search requests', () => {
      it('should handle text search successfully', async () => {
        mockPropertyService.searchProperties.mockResolvedValue(sampleSearchResults);

        const searchRequest = {
          query: 'modern condo swimming pool',
          pagination: { page: 1, limit: 20 },
          sortBy: 'relevance',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].title).toBe('Modern Condo Near BTS');
        expect(response.body.pagination).toBeDefined();
        expect(response.body.searchMeta).toBeDefined();
        expect(response.body.searchMeta.hasTextSearch).toBe(true);

        expect(mockPropertyService.searchProperties).toHaveBeenCalledWith(searchRequest);
      });

      it('should handle geospatial search successfully', async () => {
        mockPropertyService.searchProperties.mockResolvedValue(sampleSearchResults);

        const searchRequest = {
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10,
          },
          pagination: { page: 1, limit: 20 },
          sortBy: 'distance',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data[0].distance).toBe(2.5);
        expect(response.body.searchMeta.hasLocationSearch).toBe(true);

        expect(mockPropertyService.searchProperties).toHaveBeenCalledWith(searchRequest);
      });

      it('should handle combined search with filters', async () => {
        mockPropertyService.searchProperties.mockResolvedValue(sampleSearchResults);

        const searchRequest = {
          query: 'luxury condo',
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 5,
          },
          filters: {
            propertyType: 'condo',
            minPrice: 3000000,
            maxPrice: 5000000,
            bedrooms: 2,
          },
          pagination: { page: 1, limit: 10 },
          sortBy: 'relevance',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.searchMeta.appliedFilters.propertyType).toBe('condo');

        expect(mockPropertyService.searchProperties).toHaveBeenCalledWith(searchRequest);
      });

      it('should handle empty search (get all available properties)', async () => {
        const emptySearchResults = {
          ...sampleSearchResults,
          searchMeta: {
            hasTextSearch: false,
            hasLocationSearch: false,
            appliedFilters: { status: 'available' },
            sortBy: 'relevance',
          }
        };

        mockPropertyService.searchProperties.mockResolvedValue(emptySearchResults);

        const searchRequest = {};

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.searchMeta.hasTextSearch).toBe(false);
        expect(response.body.searchMeta.hasLocationSearch).toBe(false);
      });

      it('should handle pagination parameters', async () => {
        const paginatedResults = {
          ...sampleSearchResults,
          pagination: {
            currentPage: 2,
            totalPages: 5,
            totalResults: 87,
            itemsPerPage: 20,
            hasNextPage: true,
            hasPreviousPage: true,
          }
        };

        mockPropertyService.searchProperties.mockResolvedValue(paginatedResults);

        const searchRequest = {
          query: 'condo',
          pagination: { page: 2, limit: 20 },
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        expect(response.body.pagination.currentPage).toBe(2);
        expect(response.body.pagination.hasNextPage).toBe(true);
        expect(response.body.pagination.hasPreviousPage).toBe(true);
      });

      it('should handle different sort options', async () => {
        const sortOptions = [
          'relevance', 'price_asc', 'price_desc', 'area_asc', 'area_desc',
          'distance', 'newest', 'oldest',
        ];

        for (const sortBy of sortOptions) {
          mockPropertyService.searchProperties.mockResolvedValue({
            ...sampleSearchResults,
            searchMeta: { ...sampleSearchResults.searchMeta, sortBy },
          });

          const searchRequest = {
            query: 'test',
            sortBy,
          };

          if (sortBy === 'distance') {
            searchRequest.location = {
              coordinates: [100.5412, 13.7563],
              radius: 10,
            };
          }

          const response = await request(app)
            .post('/api/properties/search')
            .send(searchRequest)
            .expect(200);

          expect(response.body.searchMeta.sortBy).toBe(sortBy);
        }
      });
    });

    describe('validation errors', () => {
      it('should validate location coordinates format', async () => {
        const invalidRequests = [
          {
            location: {
              coordinates: [100.5412], // Missing latitude
              radius: 10,
            }
          },
          {
            location: {
              coordinates: [200, 13.7563], // Invalid longitude
              radius: 10,
            }
          },
          {
            location: {
              coordinates: [100.5412, 100], // Invalid latitude
              radius: 10,
            }
          },
          {
            location: {
              coordinates: 'invalid', // Wrong type
              radius: 10,
            }
          },
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/api/properties/search')
            .send(invalidRequest)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should validate radius range', async () => {
        const invalidRequests = [
          {
            location: {
              coordinates: [100.5412, 13.7563],
              radius: 0, // Too small
            }
          },
          {
            location: {
              coordinates: [100.5412, 13.7563],
              radius: 101, // Too large
            }
          },
          {
            location: {
              coordinates: [100.5412, 13.7563],
              radius: -5, // Negative
            }
          },
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/api/properties/search')
            .send(invalidRequest)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should validate price range filters', async () => {
        const invalidRequests = [
          {
            filters: {
              minPrice: -1000, // Negative price
            }
          },
          {
            filters: {
              minPrice: 5000000,
              maxPrice: 3000000, // Min > Max
            }
          },
          {
            filters: {
              maxPrice: 'invalid', // Wrong type
            }
          },
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/api/properties/search')
            .send(invalidRequest)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should validate property type filters', async () => {
        const invalidRequests = [
          {
            filters: {
              propertyType: 'invalid_type',
            }
          },
          {
            filters: {
              propertyType: ['condo', 'invalid_type'],
            }
          },
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/api/properties/search')
            .send(invalidRequest)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should validate pagination parameters', async () => {
        const invalidRequests = [
          {
            pagination: {
              page: 0, // Invalid page number
            }
          },
          {
            pagination: {
              page: -1, // Negative page
            }
          },
          {
            pagination: {
              limit: 0, // Invalid limit
            }
          },
          {
            pagination: {
              limit: 51, // Exceeds maximum
            }
          },
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/api/properties/search')
            .send(invalidRequest)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should validate sort options', async () => {
        const invalidRequest = {
          sortBy: 'invalid_sort_option',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require coordinates when location is provided', async () => {
        const invalidRequest = {
          location: {
            radius: 10, // Missing coordinates
          }
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toBeDefined();
        expect(response.body.error.details.some(detail => 
          detail.message.includes('coordinates are required') || 
          detail.message.includes('Location coordinates are required'),
        )).toBe(true);
      });
    });

    describe('service error handling', () => {
      it('should handle search validation errors from service', async () => {
        const validationError = new Error('Invalid search parameters');
        validationError.code = 'SEARCH_VALIDATION_ERROR';
        mockPropertyService.searchProperties.mockRejectedValue(validationError);

        const searchRequest = {
          query: 'test search',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SEARCH_VALIDATION_ERROR');
      });

      it('should handle text index errors', async () => {
        const textIndexError = new Error('Text search not available');
        textIndexError.code = 'TEXT_INDEX_ERROR';
        mockPropertyService.searchProperties.mockRejectedValue(textIndexError);

        const searchRequest = {
          query: 'test search',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(503);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEXT_INDEX_ERROR');
      });

      it('should handle geospatial index errors', async () => {
        const geoIndexError = new Error('Geospatial search not available');
        geoIndexError.code = 'GEO_INDEX_ERROR';
        mockPropertyService.searchProperties.mockRejectedValue(geoIndexError);

        const searchRequest = {
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10,
          }
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(503);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('GEO_INDEX_ERROR');
      });

      it('should handle general service errors', async () => {
        const serviceError = new Error('Database connection failed');
        mockPropertyService.searchProperties.mockRejectedValue(serviceError);

        const searchRequest = {
          query: 'test search',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });

    describe('response format validation', () => {
      it('should return properly formatted response structure', async () => {
        mockPropertyService.searchProperties.mockResolvedValue(sampleSearchResults);

        const searchRequest = {
          query: 'modern condo',
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10,
          }
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        // Validate response structure
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('searchMeta');

        // Validate property structure
        const property = response.body.data[0];
        expect(property).toHaveProperty('id');
        expect(property).toHaveProperty('title');
        expect(property).toHaveProperty('description');
        expect(property).toHaveProperty('price');
        expect(property).toHaveProperty('formattedPrice');
        expect(property).toHaveProperty('propertyType');
        expect(property).toHaveProperty('area');
        expect(property).toHaveProperty('pricePerSqm');
        expect(property).toHaveProperty('location');
        expect(property).toHaveProperty('relevanceScore');
        expect(property).toHaveProperty('textScore');
        expect(property).toHaveProperty('distance');

        // Validate pagination structure
        expect(response.body.pagination).toHaveProperty('currentPage');
        expect(response.body.pagination).toHaveProperty('totalPages');
        expect(response.body.pagination).toHaveProperty('totalResults');
        expect(response.body.pagination).toHaveProperty('itemsPerPage');
        expect(response.body.pagination).toHaveProperty('hasNextPage');
        expect(response.body.pagination).toHaveProperty('hasPreviousPage');

        // Validate search metadata structure
        expect(response.body.searchMeta).toHaveProperty('hasTextSearch');
        expect(response.body.searchMeta).toHaveProperty('hasLocationSearch');
        expect(response.body.searchMeta).toHaveProperty('appliedFilters');
        expect(response.body.searchMeta).toHaveProperty('sortBy');
      });

      it('should handle empty search results', async () => {
        const emptyResults = {
          properties: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalResults: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          searchMeta: {
            hasTextSearch: true,
            hasLocationSearch: false,
            appliedFilters: {},
            sortBy: 'relevance',
          }
        };

        mockPropertyService.searchProperties.mockResolvedValue(emptyResults);

        const searchRequest = {
          query: 'nonexistent property type',
        };

        const response = await request(app)
          .post('/api/properties/search')
          .send(searchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
        expect(response.body.pagination.totalResults).toBe(0);
      });
    });
  });
});