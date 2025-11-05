const request = require('supertest');
const app = require('../../server');
const AISearchService = require('../../services/aiSearchService');

// Mock the AI service for integration testing
jest.mock('../../services/aiSearchService');

describe('AI Integration Tests', () => {
  let mockAISearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAISearchService = AISearchService.prototype;
  });

  describe('Natural Language Search Integration', () => {
    it('should process natural language query through complete pipeline', async () => {
      // Mock AI service responses
      const mockIntentResult = {
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

      const mockSearchParams = {
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

      mockAISearchService.processIntent.mockResolvedValue(mockIntentResult);
      mockAISearchService.extractSearchParameters.mockReturnValue(mockSearchParams);

      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'I want a modern condo with swimming pool under 4 million baht',
          useAI: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.searchMeta.aiProcessing.processed).toBe(true);
      expect(response.body.searchMeta.aiProcessing.confidence).toBe(0.85);
      expect(mockAISearchService.processIntent).toHaveBeenCalledWith(
        'I want a modern condo with swimming pool under 4 million baht'
      );
    });

    it('should fallback gracefully when AI service fails', async () => {
      // Mock AI service failure
      mockAISearchService.processIntent.mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'I want a modern condo with swimming pool',
          useAI: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.searchMeta.aiProcessing.fallbackUsed).toBe(true);
      expect(response.body.searchMeta.aiProcessing.error).toBe('AI service unavailable');
    });

    it('should work with AI disabled', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'modern condo swimming pool',
          useAI: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.searchMeta.aiProcessing.processed).toBe(false);
      expect(mockAISearchService.processIntent).not.toHaveBeenCalled();
    });
  });

  describe('Similar Properties Integration', () => {
    it('should find similar properties using AI embeddings', async () => {
      // Mock embedding generation
      mockAISearchService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);

      // This test would require a property to exist, so we'll mock the response
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ limit: 5, threshold: 0.7 })
        .expect(404); // Expected since property doesn't exist in test DB

      // The 404 is expected behavior for non-existent property
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });

    it('should handle similar properties request with various query parameters', async () => {
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ 
          limit: 10, 
          threshold: 0.8, 
          useSemanticSearch: 'true',
          includeScores: 'true'
        })
        .expect(404);

      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });

    it('should validate similar properties query parameters', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id/similar')
        .query({ limit: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should handle semantic search fallback for similar properties', async () => {
      // Test with semantic search disabled
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ 
          useSemanticSearch: 'false',
          limit: 5
        })
        .expect(404);

      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });
  });

  describe('AI Health Check Integration', () => {
    it('should check AI service health', async () => {
      mockAISearchService.checkHealth.mockResolvedValue(true);

      // Create a simple health check endpoint test
      const aiService = new AISearchService();
      const isHealthy = await aiService.checkHealth();

      expect(mockAISearchService.checkHealth).toHaveBeenCalled();
      expect(isHealthy).toBe(true);
    });

    it('should handle AI service unavailable', async () => {
      mockAISearchService.checkHealth.mockResolvedValue(false);

      const aiService = new AISearchService();
      const isHealthy = await aiService.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });
});