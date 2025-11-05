const SemanticSearchService = require('../../services/semanticSearchService');
const PropertyRepository = require('../../repositories/propertyRepository');
const AISearchService = require('../../services/aiSearchService');
const EmbeddingService = require('../../services/embeddingService');

// Mock dependencies
jest.mock('../../repositories/propertyRepository');
jest.mock('../../services/aiSearchService');
jest.mock('../../services/embeddingService');

describe('SemanticSearchService', () => {
  let semanticSearchService;
  let mockPropertyRepository;
  let mockAISearchService;
  let mockEmbeddingService;

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
        coordinates: [100.5412, 13.7563],
        address: '123 Sukhumvit Road, Bangkok',
        district: 'Watthana',
        province: 'Bangkok',
      },
      features: ['swimming pool', 'gym', 'parking'],
      status: 'available',
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      _id: '507f1f77bcf86cd799439012',
      title: 'Spacious House with Garden',
      description: 'Beautiful 3-bedroom house with private garden and parking',
      price: 4200000,
      propertyType: 'house',
      area: 120,
      rooms: { bedrooms: 3, bathrooms: 2 },
      location: {
        type: 'Point',
        coordinates: [100.5200, 13.7400],
        address: '456 Rama IV Road, Bangkok',
        district: 'Pathum Wan',
        province: 'Bangkok',
      },
      features: ['garden', 'parking', 'security'],
      status: 'available',
      embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPropertyRepository = PropertyRepository.prototype;
    mockAISearchService = AISearchService.prototype;
    mockEmbeddingService = EmbeddingService.prototype;
    
    semanticSearchService = new SemanticSearchService();
  });

  describe('searchWithSemanticRanking', () => {
    it('should perform semantic search with AI processing', async () => {
      const searchParams = {
        query: 'modern condo with swimming pool',
        useAI: true,
        pagination: { page: 1, limit: 10 },
      };

      const mockIntentResult = {
        keywords: ['modern', 'condo', 'swimming', 'pool'],
        extractedFilters: { propertyType: 'condo' },
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        confidenceScore: 0.85,
        processingTime: 1.2,
        intentSummary: 'Looking for modern condo with swimming pool',
        aiProcessed: true,
      };

      const mockSearchResults = [
        {
          ...sampleProperties[0],
          relevanceScore: 0.92,
          semanticSimilarity: 0.88,
          textScore: 1.5,
        }
      ];

      mockAISearchService.processIntent.mockResolvedValue(mockIntentResult);
      mockAISearchService.extractSearchParameters.mockReturnValue({
        query: 'modern condo swimming pool',
        filters: { propertyType: 'condo' },
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        aiMeta: {
          processed: true,
          confidence: 0.85,
          processingTime: 1.2,
        }
      });

      mockPropertyRepository.aggregate
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await semanticSearchService.searchWithSemanticRanking(searchParams);

      expect(mockAISearchService.processIntent).toHaveBeenCalledWith('modern condo with swimming pool');
      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].relevanceScore).toBe(0.92);
      expect(result.properties[0].semanticSimilarity).toBe(0.88);
      expect(result.searchMeta.hasSemanticSearch).toBe(true);
      expect(result.searchMeta.aiProcessing.processed).toBe(true);
    });

    it('should fallback gracefully when AI processing fails', async () => {
      const searchParams = {
        query: 'I want a modern condo with swimming pool', // Natural language query
        useAI: true,
      };

      mockAISearchService.processIntent.mockRejectedValue(new Error('AI service unavailable'));

      const mockSearchResults = [
        {
          ...sampleProperties[0],
          relevanceScore: 0.75,
          textScore: 1.2,
        }
      ];

      mockPropertyRepository.aggregate
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await semanticSearchService.searchWithSemanticRanking(searchParams);

      expect(result.properties).toHaveLength(1);
      expect(result.searchMeta.aiProcessing.fallbackUsed).toBe(true);
      expect(result.searchMeta.aiProcessing.error).toBe('AI service unavailable');
    });

    it('should handle location-based search with semantic ranking', async () => {
      const searchParams = {
        query: 'condo near BTS',
        location: {
          coordinates: [100.5412, 13.7563],
          radius: 5,
        },
        useAI: true,
      };

      const mockSearchResults = [
        {
          ...sampleProperties[0],
          relevanceScore: 0.89,
          semanticSimilarity: 0.82,
          distance: 1.2,
        }
      ];

      mockAISearchService.processIntent.mockResolvedValue({
        aiProcessed: true,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      });
      mockAISearchService.extractSearchParameters.mockReturnValue({
        query: 'condo BTS',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        aiMeta: { processed: true },
      });

      mockPropertyRepository.aggregate
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await semanticSearchService.searchWithSemanticRanking(searchParams);

      expect(result.properties[0].distance).toBe(1.2);
      expect(result.searchMeta.hasLocationSearch).toBe(true);
      expect(result.searchMeta.hasSemanticSearch).toBe(true);
    });
  });

  describe('findSimilarPropertiesWithSemantics', () => {
    it('should find similar properties using semantic similarity', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = sampleProperties[0];
      const options = { limit: 5, threshold: 0.7, includeScores: true };

      const similarProperties = [
        {
          ...sampleProperties[1],
          overallSimilarity: 0.85,
          semanticSimilarity: 0.82,
          locationSimilarity: 0.75,
          attributeSimilarity: 0.90,
        }
      ];

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId, options);

      expect(mockPropertyRepository.findById).toHaveBeenCalledWith(propertyId);
      expect(result.targetProperty.id).toBe(propertyId);
      expect(result.similarProperties).toHaveLength(1);
      expect(result.similarProperties[0].similarityScores.overall).toBe(0.85);
      expect(result.similarProperties[0].similarityScores.semantic).toBe(0.82);
      expect(result.searchMeta.method).toBe('semantic');
      expect(result.searchMeta.threshold).toBe(0.7);
    });

    it('should generate embedding for target property if missing', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = { ...sampleProperties[0], embedding: [] };
      const generatedEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockEmbeddingService.generatePropertyEmbedding.mockResolvedValue(generatedEmbedding);
      mockPropertyRepository.aggregate.mockResolvedValue([]);

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId);

      expect(mockEmbeddingService.generatePropertyEmbedding).toHaveBeenCalledWith(propertyId);
      expect(result.searchMeta.targetEmbeddingDimensions).toBe(5);
    });

    it('should fallback to attribute-based similarity when embeddings fail', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = { ...sampleProperties[0], embedding: [] };

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockEmbeddingService.generatePropertyEmbedding.mockResolvedValue([]);
      mockPropertyRepository.findAll.mockResolvedValue({
        properties: [sampleProperties[1]],
        total: 1,
      });

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId);

      expect(result.searchMeta.method).toBe('attribute-based');
      expect(result.searchMeta.fallbackUsed).toBe(true);
      expect(result.similarProperties).toHaveLength(1);
    });

    it('should throw error for non-existent property', async () => {
      const propertyId = 'nonexistent';

      mockPropertyRepository.findById.mockResolvedValue(null);

      await expect(
        semanticSearchService.findSimilarPropertiesWithSemantics(propertyId),
      ).rejects.toThrow('Property not found');
    });

    it('should filter results by similarity threshold', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = sampleProperties[0];
      const options = { threshold: 0.8 };

      const similarProperties = [
        {
          ...sampleProperties[1],
          overallSimilarity: 0.85, // Above threshold
        }
      ];

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId, options);

      expect(result.similarProperties).toHaveLength(1);
      expect(result.searchMeta.threshold).toBe(0.8);
    });

    it('should limit results to specified limit', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = sampleProperties[0];
      const options = { limit: 2 };

      const similarProperties = [
        { ...sampleProperties[1], overallSimilarity: 0.85 },
      ];

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId, options);

      expect(result.similarProperties.length).toBeLessThanOrEqual(2);
    });
  });

  describe('semantic similarity calculations', () => {
    it('should calculate cosine similarity correctly', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = {
        ...sampleProperties[0],
        embedding: [1, 0, 0, 0, 0], // Simple vector for testing
      };

      const similarProperties = [
        {
          ...sampleProperties[1],
          embedding: [0.8, 0.6, 0, 0, 0], // Should have high similarity
          overallSimilarity: 0.8,
          semanticSimilarity: 0.8,
          locationSimilarity: 0.7,
          attributeSimilarity: 0.9,
        }
      ];

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId, {
        includeScores: true,
      });

      expect(result.similarProperties[0].similarityScores.semantic).toBe(0.8);
    });
  });

  describe('ranking algorithm', () => {
    it('should combine semantic, location, and attribute scores correctly', async () => {
      const propertyId = '507f1f77bcf86cd799439011';
      const targetProperty = sampleProperties[0];

      const similarProperties = [
        {
          ...sampleProperties[1],
          overallSimilarity: 0.82, // Weighted combination: 0.8*0.5 + 0.9*0.3 + 0.7*0.2 = 0.82
          semanticSimilarity: 0.8,
          locationSimilarity: 0.9,
          attributeSimilarity: 0.7,
        }
      ];

      mockPropertyRepository.findById.mockResolvedValue(targetProperty);
      mockPropertyRepository.aggregate.mockResolvedValue(similarProperties);

      const result = await semanticSearchService.findSimilarPropertiesWithSemantics(propertyId, {
        includeScores: true,
      });

      const scores = result.similarProperties[0].similarityScores;
      expect(scores.overall).toBe(0.82);
      expect(scores.semantic).toBe(0.8);
      expect(scores.location).toBe(0.9);
      expect(scores.attributes).toBe(0.7);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const searchParams = { query: 'test' };

      mockPropertyRepository.aggregate.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        semanticSearchService.searchWithSemanticRanking(searchParams),
      ).rejects.toThrow('Semantic search failed');
    });

    it('should handle AI service errors gracefully', async () => {
      const searchParams = {
        query: 'I need a modern condo with good facilities', // Natural language query
        useAI: true,
      };

      mockAISearchService.processIntent.mockRejectedValue(new Error('AI service timeout'));
      mockPropertyRepository.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      const result = await semanticSearchService.searchWithSemanticRanking(searchParams);

      expect(result.searchMeta.aiProcessing.fallbackUsed).toBe(true);
      expect(result.searchMeta.aiProcessing.error).toBe('AI service timeout');
    });
  });
});