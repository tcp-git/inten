const AISearchService = require('../../services/aiSearchService');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('AISearchService', () => {
  let aiSearchService;
  let mockAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    mockAxios = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    axios.create.mockReturnValue(mockAxios);
    
    aiSearchService = new AISearchService();
  });

  describe('processIntent', () => {
    it('should process natural language query successfully', async () => {
      const mockResponse = {
        data: {
          keywords: ['modern', 'condo', 'swimming', 'pool'],
          extracted_filters: {
            property_type: 'condo',
            price_max: 4000000
          },
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          confidence_score: 0.85,
          processing_time: 1.2,
          intent_summary: 'Looking for modern condo with swimming pool'
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const query = 'I want a modern condo with swimming pool under 4 million baht';
      const result = await aiSearchService.processIntent(query);

      expect(mockAxios.post).toHaveBeenCalledWith('/intent', { query });
      expect(result.keywords).toEqual(['modern', 'condo', 'swimming', 'pool']);
      expect(result.extractedFilters.property_type).toBe('condo');
      expect(result.aiProcessed).toBe(true);
    });

    it('should handle AI service errors gracefully', async () => {
      mockAxios.post.mockRejectedValue(new Error('AI service unavailable'));

      const query = 'I want a modern condo';
      const result = await aiSearchService.processIntent(query);

      expect(result.aiProcessed).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.keywords).toEqual(['want', 'modern', 'condo']);
    });

    it('should validate query input', async () => {
      const result = await aiSearchService.processIntent('');
      
      expect(result.aiProcessed).toBe(false);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding successfully', async () => {
      const mockResponse = {
        data: {
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          processing_time: 0.5
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const text = 'Modern condo with swimming pool';
      const result = await aiSearchService.generateEmbedding(text);

      expect(mockAxios.post).toHaveBeenCalledWith('/embedding', { text });
      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('should handle embedding generation errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Embedding service failed'));

      const text = 'Modern condo with swimming pool';
      const result = await aiSearchService.generateEmbedding(text);

      expect(result).toEqual([]);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity successfully', async () => {
      const mockResponse = {
        data: {
          similarity_score: 0.85,
          processing_time: 0.1
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.2, 0.3, 0.4];
      const result = await aiSearchService.calculateSimilarity(embedding1, embedding2);

      expect(mockAxios.post).toHaveBeenCalledWith('/similarity', { embedding1, embedding2 });
      expect(result).toBe(0.85);
    });

    it('should handle empty embeddings', async () => {
      const result = await aiSearchService.calculateSimilarity([], [0.1, 0.2]);
      expect(result).toBe(0);
    });
  });

  describe('checkHealth', () => {
    it('should return true for healthy service', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy', model_loaded: true }
      });

      const result = await aiSearchService.checkHealth();
      expect(result).toBe(true);
    });

    it('should return false for unhealthy service', async () => {
      mockAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await aiSearchService.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('extractSearchParameters', () => {
    it('should extract search parameters from AI intent', () => {
      const intentResult = {
        keywords: ['modern', 'condo', 'pool'],
        extractedFilters: {
          property_type: 'condo',
          price_max: 4000000,
          bedrooms: 2
        },
        embedding: [0.1, 0.2, 0.3],
        confidenceScore: 0.85,
        processingTime: 1.2,
        intentSummary: 'Looking for modern condo',
        aiProcessed: true
      };

      const result = aiSearchService.extractSearchParameters(intentResult);

      expect(result.query).toBe('modern condo pool');
      expect(result.filters.propertyType).toBe('condo');
      expect(result.filters.maxPrice).toBe(4000000);
      expect(result.filters.bedrooms).toBe(2);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.aiMeta.processed).toBe(true);
      expect(result.aiMeta.confidence).toBe(0.85);
    });

    it('should handle extraction errors gracefully', () => {
      const invalidIntentResult = null;

      const result = aiSearchService.extractSearchParameters(invalidIntentResult);

      expect(result.query).toBe('');
      expect(result.filters).toEqual({});
      expect(result.aiMeta.processed).toBe(false);
    });
  });
});