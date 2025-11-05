const SearchService = require('../../services/searchService');
const PropertyRepository = require('../../repositories/propertyRepository');
const AISearchService = require('../../services/aiSearchService');

// Mock the dependencies
jest.mock('../../repositories/propertyRepository');
jest.mock('../../services/aiSearchService');

describe('SearchService', () => {
  let searchService;
  let mockPropertyRepository;
  let mockAISearchService;

  const sampleProperties = [
    {
      _id: '507f1f77bcf86cd799439011',
      title: 'Modern Condo Near BTS',
      description: 'Luxury 2-bedroom condo with city view and swimming pool',
      price: 3500000,
      propertyType: 'condo',
      area: 85,
      rooms: { bedrooms: 2, bathrooms: 2 },
      location: {
        type: 'Point',
        coordinates: [100.5412, 13.7563], // Bangkok
        address: '123 Sukhumvit Road, Bangkok',
        district: 'Watthana',
        province: 'Bangkok'
      },
      features: ['Swimming Pool', 'Gym', 'Security'],
      status: 'available',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      _id: '507f1f77bcf86cd799439012',
      title: 'Spacious House with Garden',
      description: 'Beautiful 3-bedroom house with large garden and parking',
      price: 2800000,
      propertyType: 'house',
      area: 120,
      rooms: { bedrooms: 3, bathrooms: 2 },
      location: {
        type: 'Point',
        coordinates: [100.5200, 13.7400], // Nearby location
        address: '456 Rama IV Road, Bangkok',
        district: 'Pathum Wan',
        province: 'Bangkok'
      },
      features: ['Garden', 'Parking', 'Security'],
      status: 'available',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10')
    },
    {
      _id: '507f1f77bcf86cd799439013',
      title: 'Affordable Townhouse',
      description: 'Cozy 2-bedroom townhouse in quiet neighborhood',
      price: 1500000,
      propertyType: 'townhouse',
      area: 75,
      rooms: { bedrooms: 2, bathrooms: 1 },
      location: {
        type: 'Point',
        coordinates: [100.6000, 13.8000], // Further location
        address: '789 Lat Phrao Road, Bangkok',
        district: 'Lat Phrao',
        province: 'Bangkok'
      },
      features: ['Quiet Area', 'Near School'],
      status: 'available',
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = new SearchService();
    mockPropertyRepository = PropertyRepository.prototype;
    mockAISearchService = AISearchService.prototype;
  });

  describe('searchProperties', () => {
    describe('text search functionality', () => {
      it('should perform text search with keywords', async () => {
        const searchResults = [
          { ...sampleProperties[0], textScore: 1.2, relevanceScore: 0.85 },
          { ...sampleProperties[1], textScore: 0.8, relevanceScore: 0.65 }
        ];

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults) // Search results
          .mockResolvedValueOnce([{ total: 2 }]); // Count results

        const searchParams = {
          query: 'modern condo swimming pool',
          pagination: { page: 1, limit: 20 }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(mockPropertyRepository.aggregate).toHaveBeenCalledTimes(2);
        
        // Check that text search pipeline was built correctly
        const searchPipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        expect(searchPipeline).toContainEqual({
          $match: { $text: { $search: 'modern condo swimming pool' } }
        });
        expect(searchPipeline).toContainEqual({
          $addFields: { textScore: { $meta: 'textScore' } }
        });

        expect(result.properties).toHaveLength(2);
        expect(result.properties[0].textScore).toBe(1.2);
        expect(result.searchMeta.hasTextSearch).toBe(true);
      });

      it('should handle empty search query', async () => {
        const searchResults = sampleProperties.map(p => ({ ...p, relevanceScore: 0.5 }));

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          query: '',
          pagination: { page: 1, limit: 20 }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(3);
        expect(result.searchMeta.hasTextSearch).toBe(false);
      });

      it('should handle search with various keywords', async () => {
        const testCases = [
          'luxury condo',
          'house garden',
          'swimming pool gym',
          'near BTS',
          'quiet neighborhood'
        ];

        for (const query of testCases) {
          mockPropertyRepository.aggregate
            .mockResolvedValueOnce([sampleProperties[0]])
            .mockResolvedValueOnce([{ total: 1 }]);

          const result = await searchService.searchProperties({ query });

          expect(result.searchMeta.hasTextSearch).toBe(true);
          expect(mockPropertyRepository.aggregate).toHaveBeenCalled();
        }
      });
    });

    describe('geospatial search functionality', () => {
      it('should perform location-based search with distance calculation', async () => {
        const searchResults = sampleProperties.map(p => ({
          ...p,
          distance: 2.5, // km
          relevanceScore: 0.8
        }));

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          location: {
            coordinates: [100.5412, 13.7563], // Bangkok center
            radius: 10 // 10km radius
          },
          pagination: { page: 1, limit: 20 }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(3);
        expect(result.properties[0].distance).toBe(2.5);
        expect(result.searchMeta.hasLocationSearch).toBe(true);

        // Verify geospatial pipeline was built
        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        expect(pipeline.some(stage => stage.$geoNear || stage.$match?.location)).toBe(true);
      });

      it('should search with different radius values', async () => {
        const testRadii = [1, 5, 10, 25, 50];

        for (const radius of testRadii) {
          mockPropertyRepository.aggregate
            .mockResolvedValueOnce([sampleProperties[0]])
            .mockResolvedValueOnce([{ total: 1 }]);

          const searchParams = {
            location: {
              coordinates: [100.5412, 13.7563],
              radius
            }
          };

          const result = await searchService.searchProperties(searchParams);

          expect(result.searchMeta.hasLocationSearch).toBe(true);
        }
      });

      it('should handle different coordinate locations', async () => {
        const testLocations = [
          [100.5412, 13.7563], // Bangkok center
          [100.5200, 13.7400], // Pathum Wan
          [100.6000, 13.8000], // Lat Phrao
          [99.0000, 18.8000]   // Chiang Mai
        ];

        for (const coordinates of testLocations) {
          mockPropertyRepository.aggregate
            .mockResolvedValueOnce([sampleProperties[0]])
            .mockResolvedValueOnce([{ total: 1 }]);

          const searchParams = {
            location: { coordinates, radius: 10 }
          };

          const result = await searchService.searchProperties(searchParams);

          expect(result.searchMeta.hasLocationSearch).toBe(true);
        }
      });
    });

    describe('combined search filters', () => {
      it('should apply price range filters', async () => {
        const searchResults = [sampleProperties[1]]; // Only house within price range

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          filters: {
            minPrice: 2000000,
            maxPrice: 3000000
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.properties[0].price).toBeGreaterThanOrEqual(2000000);
        expect(result.properties[0].price).toBeLessThanOrEqual(3000000);

        // Verify price filter in pipeline
        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        const matchStage = pipeline.find(stage => stage.$match);
        expect(matchStage.$match.price).toEqual({ $gte: 2000000, $lte: 3000000 });
      });

      it('should apply property type filters', async () => {
        const searchResults = [sampleProperties[0]]; // Only condo

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          filters: {
            propertyType: 'condo'
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.properties[0].propertyType).toBe('condo');
      });

      it('should apply multiple property type filters', async () => {
        const searchResults = [sampleProperties[0], sampleProperties[1]]; // Condo and house

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 2 }]);

        const searchParams = {
          filters: {
            propertyType: ['condo', 'house']
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(2);
        expect(['condo', 'house']).toContain(result.properties[0].propertyType);
        expect(['condo', 'house']).toContain(result.properties[1].propertyType);
      });

      it('should apply area range filters', async () => {
        const searchResults = [sampleProperties[1]]; // House with 120 sqm

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          filters: {
            minArea: 100,
            maxArea: 150
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.properties[0].area).toBeGreaterThanOrEqual(100);
        expect(result.properties[0].area).toBeLessThanOrEqual(150);
      });

      it('should apply room filters', async () => {
        const searchResults = [sampleProperties[1]]; // 3-bedroom house

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          filters: {
            bedrooms: 3,
            bathrooms: 2
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.properties[0].rooms.bedrooms).toBe(3);
        expect(result.properties[0].rooms.bathrooms).toBeGreaterThanOrEqual(2);
      });

      it('should combine text search with filters', async () => {
        const searchResults = [sampleProperties[0]]; // Modern condo matching filters

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          query: 'modern luxury',
          filters: {
            propertyType: 'condo',
            minPrice: 3000000,
            maxPrice: 4000000
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.searchMeta.hasTextSearch).toBe(true);
        expect(result.searchMeta.appliedFilters.propertyType).toBe('condo');
      });

      it('should combine location search with filters', async () => {
        const searchResults = [sampleProperties[0]]; // Condo near location

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 5
          },
          filters: {
            propertyType: 'condo',
            minPrice: 3000000
          }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.searchMeta.hasLocationSearch).toBe(true);
        expect(result.searchMeta.appliedFilters.propertyType).toBe('condo');
      });
    });

    describe('pagination functionality', () => {
      it('should handle pagination correctly', async () => {
        const allResults = sampleProperties.map(p => ({ ...p, relevanceScore: 0.5 }));
        const pageResults = [allResults[0]]; // First page with limit 1

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(pageResults)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          pagination: { page: 1, limit: 1 }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.properties).toHaveLength(1);
        expect(result.pagination).toEqual({
          currentPage: 1,
          totalPages: 3,
          totalResults: 3,
          itemsPerPage: 1,
          hasNextPage: true,
          hasPreviousPage: false
        });

        // Verify pagination in pipeline
        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        expect(pipeline).toContainEqual({ $skip: 0 });
        expect(pipeline).toContainEqual({ $limit: 1 });
      });

      it('should handle different page sizes', async () => {
        const pageSizes = [5, 10, 20, 50];

        for (const limit of pageSizes) {
          mockPropertyRepository.aggregate
            .mockResolvedValueOnce(sampleProperties.slice(0, Math.min(limit, 3)))
            .mockResolvedValueOnce([{ total: 3 }]);

          const searchParams = {
            pagination: { page: 1, limit }
          };

          const result = await searchService.searchProperties(searchParams);

          expect(result.pagination.itemsPerPage).toBe(limit);
          expect(result.properties.length).toBeLessThanOrEqual(limit);
        }
      });

      it('should handle second page correctly', async () => {
        const pageResults = [sampleProperties[1]]; // Second item

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(pageResults)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          pagination: { page: 2, limit: 1 }
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.pagination).toEqual({
          currentPage: 2,
          totalPages: 3,
          totalResults: 3,
          itemsPerPage: 1,
          hasNextPage: true,
          hasPreviousPage: true
        });

        // Verify skip calculation
        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        expect(pipeline).toContainEqual({ $skip: 1 }); // (page - 1) * limit
      });

      it('should enforce maximum page size limit', async () => {
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(sampleProperties)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          pagination: { page: 1, limit: 100 } // Exceeds max of 50
        };

        const result = await searchService.searchProperties(searchParams);

        // Should be capped at 50
        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        expect(pipeline).toContainEqual({ $limit: 50 });
      });
    });

    describe('sorting functionality', () => {
      it('should sort by relevance by default', async () => {
        const searchResults = sampleProperties.map(p => ({ ...p, relevanceScore: Math.random() }));

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          query: 'test search'
        };

        const result = await searchService.searchProperties(searchParams);

        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        const sortStage = pipeline.find(stage => stage.$sort);
        expect(sortStage.$sort).toEqual({ relevanceScore: -1, createdAt: -1 });
      });

      it('should sort by price ascending', async () => {
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(sampleProperties)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          sortBy: 'price_asc'
        };

        const result = await searchService.searchProperties(searchParams);

        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        const sortStage = pipeline.find(stage => stage.$sort);
        expect(sortStage.$sort).toEqual({ price: 1, createdAt: -1 });
      });

      it('should sort by distance when location provided', async () => {
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(sampleProperties)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10
          },
          sortBy: 'distance'
        };

        const result = await searchService.searchProperties(searchParams);

        const pipeline = mockPropertyRepository.aggregate.mock.calls[0][0];
        const sortStage = pipeline.find(stage => stage.$sort);
        expect(sortStage.$sort).toEqual({ distance: 1, createdAt: -1 });
      });

      it('should handle all sort options', async () => {
        const sortOptions = [
          'relevance', 'price_asc', 'price_desc', 'area_asc', 'area_desc',
          'distance', 'newest', 'oldest'
        ];

        for (const sortBy of sortOptions) {
          mockPropertyRepository.aggregate
            .mockResolvedValueOnce(sampleProperties)
            .mockResolvedValueOnce([{ total: 3 }]);

          const searchParams = { sortBy };
          if (sortBy === 'distance') {
            searchParams.location = { coordinates: [100.5412, 13.7563], radius: 10 };
          }

          const result = await searchService.searchProperties(searchParams);

          expect(result.searchMeta.sortBy).toBe(sortBy);
        }
      });
    });

    describe('error handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPropertyRepository.aggregate.mockRejectedValue(new Error('Database connection failed'));

        const searchParams = {
          query: 'test search'
        };

        await expect(searchService.searchProperties(searchParams))
          .rejects
          .toThrow('Property search failed');
      });

      it('should handle text index errors', async () => {
        const textIndexError = new Error('text index not found');
        mockPropertyRepository.aggregate.mockRejectedValue(textIndexError);

        const searchParams = {
          query: 'test search'
        };

        await expect(searchService.searchProperties(searchParams))
          .rejects
          .toThrow('Text search not available');
      });

      it('should handle geospatial index errors', async () => {
        const geoIndexError = new Error('2dsphere index not found');
        mockPropertyRepository.aggregate.mockRejectedValue(geoIndexError);

        const searchParams = {
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10
          }
        };

        await expect(searchService.searchProperties(searchParams))
          .rejects
          .toThrow('Geospatial search not available');
      });
    });

    describe('AI integration', () => {
      it('should process natural language queries with AI', async () => {
        const aiIntentResult = {
          keywords: ['modern', 'condo', 'swimming', 'pool'],
          extractedFilters: {
            property_type: 'condo',
            price_max: 4000000
          },
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          confidenceScore: 0.85,
          processingTime: 1.2,
          intentSummary: 'Looking for modern condo with swimming pool',
          aiProcessed: true
        };

        const aiSearchParams = {
          query: 'modern condo swimming pool',
          filters: { propertyType: 'condo', maxPrice: 4000000 },
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          aiMeta: {
            processed: true,
            confidence: 0.85,
            intentSummary: 'Looking for modern condo with swimming pool',
            processingTime: 1.2
          }
        };

        mockAISearchService.processIntent.mockResolvedValue(aiIntentResult);
        mockAISearchService.extractSearchParameters.mockReturnValue(aiSearchParams);

        const searchResults = [{ ...sampleProperties[0], relevanceScore: 0.9 }];
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          query: 'I want a modern condo with swimming pool under 4 million baht',
          useAI: true
        };

        const result = await searchService.searchProperties(searchParams);

        expect(mockAISearchService.processIntent).toHaveBeenCalledWith(searchParams.query);
        expect(mockAISearchService.extractSearchParameters).toHaveBeenCalledWith(aiIntentResult);
        expect(result.searchMeta.aiProcessing.processed).toBe(true);
        expect(result.searchMeta.aiProcessing.confidence).toBe(0.85);
      });

      it('should fallback to regular search when AI fails', async () => {
        mockAISearchService.processIntent.mockRejectedValue(new Error('AI service unavailable'));

        const searchResults = [{ ...sampleProperties[0], relevanceScore: 0.7 }];
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          query: 'I want a modern condo with swimming pool',
          useAI: true
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.searchMeta.aiProcessing.fallbackUsed).toBe(true);
        expect(result.searchMeta.aiProcessing.error).toBe('AI service unavailable');
        expect(result.properties).toHaveLength(1);
      });

      it('should skip AI processing for non-natural language queries', async () => {
        const searchResults = [{ ...sampleProperties[0], relevanceScore: 0.8 }];
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          query: 'condo pool', // Short, keyword-like query
          useAI: true
        };

        const result = await searchService.searchProperties(searchParams);

        expect(mockAISearchService.processIntent).not.toHaveBeenCalled();
        expect(result.searchMeta.aiProcessing.processed).toBe(false);
      });

      it('should disable AI processing when useAI is false', async () => {
        const searchResults = [{ ...sampleProperties[0], relevanceScore: 0.8 }];
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          query: 'I want a modern condo with swimming pool under 4 million baht',
          useAI: false
        };

        const result = await searchService.searchProperties(searchParams);

        expect(mockAISearchService.processIntent).not.toHaveBeenCalled();
        expect(result.searchMeta.aiProcessing.processed).toBe(false);
      });
    });

    describe('semantic similarity search', () => {
      it('should find similar properties using embeddings', async () => {
        const targetProperty = sampleProperties[0];
        const targetEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
        
        mockPropertyRepository.findById.mockResolvedValue({
          ...targetProperty,
          embedding: targetEmbedding
        });

        const similarProperties = [
          { ...sampleProperties[1], semanticSimilarity: 0.85 },
          { ...sampleProperties[2], semanticSimilarity: 0.75 }
        ];

        mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

        const result = await searchService.findSimilarProperties(targetProperty._id, {
          limit: 10,
          threshold: 0.7
        });

        expect(mockPropertyRepository.findById).toHaveBeenCalledWith(targetProperty._id);
        expect(result.similarProperties).toHaveLength(2);
        expect(result.searchMeta.method).toBe('semantic');
        expect(result.searchMeta.threshold).toBe(0.7);
      });

      it('should generate embedding if property does not have one', async () => {
        const targetProperty = { ...sampleProperties[0], embedding: [] };
        const generatedEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
        
        mockPropertyRepository.findById.mockResolvedValue(targetProperty);
        mockAISearchService.generateEmbedding.mockResolvedValue(generatedEmbedding);

        const similarProperties = [
          { ...sampleProperties[1], semanticSimilarity: 0.85 }
        ];

        mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

        const result = await searchService.findSimilarProperties(targetProperty._id);

        expect(mockAISearchService.generateEmbedding).toHaveBeenCalledWith(
          `${targetProperty.title} ${targetProperty.description}`
        );
        expect(result.similarProperties).toHaveLength(1);
      });

      it('should fallback to attribute-based similarity when embeddings fail', async () => {
        const targetProperty = { ...sampleProperties[0], embedding: [] };
        
        mockPropertyRepository.findById.mockResolvedValue(targetProperty);
        mockAISearchService.generateEmbedding.mockResolvedValue([]);

        const similarProperties = {
          properties: [sampleProperties[1]],
          total: 1
        };

        mockPropertyRepository.findAll.mockResolvedValue(similarProperties);

        const result = await searchService.findSimilarProperties(targetProperty._id);

        expect(result.searchMeta.method).toBe('attribute-based');
        expect(result.searchMeta.fallbackUsed).toBe(true);
        expect(result.similarProperties).toHaveLength(1);
      });
    });

    describe('result formatting', () => {
      it('should format search results correctly', async () => {
        const searchResults = [{
          ...sampleProperties[0],
          textScore: 1.2,
          relevanceScore: 0.85,
          distance: 2.5
        }];

        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(searchResults)
          .mockResolvedValueOnce([{ total: 1 }]);

        const searchParams = {
          query: 'modern condo',
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10
          }
        };

        const result = await searchService.searchProperties(searchParams);

        const property = result.properties[0];
        expect(property).toHaveProperty('id');
        expect(property).toHaveProperty('formattedPrice');
        expect(property).toHaveProperty('pricePerSqm');
        expect(property).toHaveProperty('relevanceScore', 0.85);
        expect(property).toHaveProperty('textScore', 1.2);
        expect(property).toHaveProperty('distance', 2.5);
        expect(property.formattedPrice).toMatch(/฿/);
      });

      it('should include search metadata', async () => {
        mockPropertyRepository.aggregate
          .mockResolvedValueOnce(sampleProperties)
          .mockResolvedValueOnce([{ total: 3 }]);

        const searchParams = {
          query: 'modern condo',
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 10
          },
          filters: {
            propertyType: 'condo',
            minPrice: 3000000
          },
          sortBy: 'relevance'
        };

        const result = await searchService.searchProperties(searchParams);

        expect(result.searchMeta).toEqual({
          hasTextSearch: true,
          hasLocationSearch: true,
          appliedFilters: {
            propertyType: 'condo',
            priceRange: { min: 3000000, max: undefined }
          },
          sortBy: 'relevance',
          aiProcessing: {
            processed: false,
            confidence: 0,
            processingTime: 0,
            fallbackUsed: false
          }
        });
      });
    });
  });
});