const axios = require('axios');
const { AIServiceError, ExternalServiceError } = require('../middleware/errors');
const logger = require('../middleware/logger');

/**
 * AI Search Service - Integration with FastAPI AI Engine
 * Handles communication with the AI engine for natural language processing
 */
class AISearchService {
  constructor() {
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8001';
    this.timeout = parseInt(process.env.AI_ENGINE_TIMEOUT) || 5000; // 5 seconds default
    this.retryAttempts = 2;
    this.retryDelay = 1000; // 1 second

    // Configure HTTP client
    this.httpClient = axios.create({
      baseURL: this.aiEngineUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Setup request/response interceptors for logging and error handling
    this._setupInterceptors();

    // Use centralized logger
    this.logger = logger;
  }

  /**
   * Process natural language query and extract search intent
   * @param {string} query - Natural language query
   * @returns {Promise<Object>} Processed intent with extracted parameters
   */
  async processIntent(query) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Query is required and must be a non-empty string');
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 1000) {
        throw new Error('Query too long. Maximum length is 1000 characters');
      }

      this.logger.info('Processing intent for query', { 
        queryLength: trimmedQuery.length,
        queryPreview: trimmedQuery.substring(0, 100) + (trimmedQuery.length > 100 ? '...' : '')
      });

      const response = await this._makeRequestWithRetry('/intent', {
        query: trimmedQuery
      });

      const result = {
        keywords: response.keywords || [],
        extractedFilters: response.extracted_filters || {},
        embedding: response.embedding || [],
        confidenceScore: response.confidence_score || 0,
        processingTime: response.processing_time || 0,
        intentSummary: response.intent_summary || '',
        aiProcessed: true
      };

      this.logger.info('Intent processing completed', {
        keywordsCount: result.keywords.length,
        hasFilters: Object.keys(result.extractedFilters).length > 0,
        confidenceScore: result.confidenceScore,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      this.logger.error('Intent processing failed', {
        error: error.message,
        query: query?.substring(0, 100)
      });

      // Return fallback result for graceful degradation
      return this._createFallbackIntent(query, error);
    }
  }

  /**
   * Generate semantic embedding for text
   * @param {string} text - Text to generate embedding for
   * @returns {Promise<Array>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text is required and must be a non-empty string');
      }

      const trimmedText = text.trim();
      if (trimmedText.length > 2000) {
        throw new Error('Text too long. Maximum length is 2000 characters');
      }

      this.logger.debug('Generating embedding for text', { 
        textLength: trimmedText.length 
      });

      const response = await this._makeRequestWithRetry('/embedding', {
        text: trimmedText
      });

      this.logger.debug('Embedding generation completed', {
        embeddingDimensions: response.embedding?.length || 0,
        processingTime: response.processing_time
      });

      return response.embedding || [];

    } catch (error) {
      this.logger.error('Embedding generation failed', {
        error: error.message,
        textLength: text?.length
      });
      
      // Return empty embedding for fallback
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {Promise<number>} Similarity score (0-1)
   */
  async calculateSimilarity(embedding1, embedding2) {
    try {
      if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
        throw new Error('Both embeddings must be arrays');
      }

      if (embedding1.length === 0 || embedding2.length === 0) {
        return 0; // No similarity if either embedding is empty
      }

      if (embedding1.length !== embedding2.length) {
        throw new Error('Embeddings must have the same dimensions');
      }

      this.logger.debug('Calculating similarity between embeddings', {
        dimensions: embedding1.length
      });

      const response = await this._makeRequestWithRetry('/similarity', {
        embedding1,
        embedding2
      });

      const similarity = response.similarity_score || 0;

      this.logger.debug('Similarity calculation completed', {
        similarityScore: similarity,
        processingTime: response.processing_time
      });

      return similarity;

    } catch (error) {
      this.logger.error('Similarity calculation failed', {
        error: error.message,
        embedding1Length: embedding1?.length,
        embedding2Length: embedding2?.length
      });
      
      // Return 0 similarity for fallback
      return 0;
    }
  }

  /**
   * Check if AI engine is available and healthy
   * @returns {Promise<boolean>} True if AI engine is available
   */
  async checkHealth() {
    try {
      const response = await this.httpClient.get('/health');
      const isHealthy = response.status === 200 && response.data.status === 'healthy';
      
      this.logger.info('AI engine health check', {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseStatus: response.status,
        modelLoaded: response.data.model_loaded
      });

      return isHealthy;

    } catch (error) {
      this.logger.warn('AI engine health check failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }
  }

  /**
   * Extract search parameters from AI-processed intent
   * @param {Object} intentResult - Result from processIntent
   * @returns {Object} Formatted search parameters for search service
   */
  extractSearchParameters(intentResult) {
    try {
      const searchParams = {
        query: '', // Will be set from keywords
        filters: {},
        aiMeta: {
          processed: intentResult.aiProcessed || false,
          confidence: intentResult.confidenceScore || 0,
          intentSummary: intentResult.intentSummary || '',
          processingTime: intentResult.processingTime || 0
        }
      };

      // Convert keywords to search query
      if (intentResult.keywords && intentResult.keywords.length > 0) {
        searchParams.query = intentResult.keywords.join(' ');
      }

      // Extract filters from AI result
      const extractedFilters = intentResult.extractedFilters || {};

      // Price filters
      if (extractedFilters.price_min !== undefined) {
        searchParams.filters.minPrice = extractedFilters.price_min;
      }
      if (extractedFilters.price_max !== undefined) {
        searchParams.filters.maxPrice = extractedFilters.price_max;
      }

      // Area filters
      if (extractedFilters.area_min !== undefined) {
        searchParams.filters.minArea = extractedFilters.area_min;
      }
      if (extractedFilters.area_max !== undefined) {
        searchParams.filters.maxArea = extractedFilters.area_max;
      }

      // Property type filter
      if (extractedFilters.property_type) {
        searchParams.filters.propertyType = extractedFilters.property_type;
      }

      // Room filters
      if (extractedFilters.bedrooms !== undefined) {
        searchParams.filters.bedrooms = extractedFilters.bedrooms;
      }
      if (extractedFilters.bathrooms !== undefined) {
        searchParams.filters.bathrooms = extractedFilters.bathrooms;
      }

      // Location filters
      if (extractedFilters.location) {
        searchParams.location = extractedFilters.location;
      }

      // Features
      if (extractedFilters.features && Array.isArray(extractedFilters.features)) {
        searchParams.filters.features = extractedFilters.features;
      }

      // Store embedding for semantic search
      if (intentResult.embedding && intentResult.embedding.length > 0) {
        searchParams.embedding = intentResult.embedding;
      }

      this.logger.debug('Extracted search parameters from AI intent', {
        hasQuery: !!searchParams.query,
        filterCount: Object.keys(searchParams.filters).length,
        hasEmbedding: !!searchParams.embedding,
        confidence: searchParams.aiMeta.confidence
      });

      return searchParams;

    } catch (error) {
      this.logger.error('Failed to extract search parameters', {
        error: error.message,
        intentResult: intentResult
      });

      // Return basic search params as fallback
      return {
        query: '',
        filters: {},
        aiMeta: {
          processed: false,
          confidence: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Setup HTTP client interceptors for logging and error handling
   * @private
   */
  _setupInterceptors() {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('AI engine request', {
          method: config.method,
          url: config.url,
          timeout: config.timeout
        });
        return config;
      },
      (error) => {
        this.logger.error('AI engine request setup failed', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('AI engine response received', {
          status: response.status,
          url: response.config.url,
          responseTime: response.headers['x-response-time']
        });
        return response;
      },
      (error) => {
        const errorInfo = {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url
        };

        if (error.code === 'ECONNREFUSED') {
          errorInfo.type = 'CONNECTION_REFUSED';
          errorInfo.message = 'AI engine is not available';
        } else if (error.code === 'ETIMEDOUT') {
          errorInfo.type = 'TIMEOUT';
          errorInfo.message = 'AI engine request timed out';
        } else if (error.response?.status >= 500) {
          errorInfo.type = 'SERVER_ERROR';
          errorInfo.message = 'AI engine internal error';
        } else if (error.response?.status >= 400) {
          errorInfo.type = 'CLIENT_ERROR';
          errorInfo.message = error.response.data?.detail || 'Invalid request to AI engine';
        }

        this.logger.error('AI engine request failed', errorInfo);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make HTTP request with retry logic
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response data
   * @private
   */
  async _makeRequestWithRetry(endpoint, data) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.httpClient.post(endpoint, data);
        return response.data;

      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.retryAttempts) {
          throw error;
        }

        // Wait before retrying
        this.logger.warn(`AI engine request failed, retrying in ${this.retryDelay}ms`, {
          attempt,
          maxAttempts: this.retryAttempts,
          error: error.message,
          endpoint
        });

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    throw lastError;
  }

  /**
   * Create fallback intent result when AI processing fails
   * @param {string} query - Original query
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback intent result
   * @private
   */
  _createFallbackIntent(query, error) {
    // Simple keyword extraction as fallback
    const keywords = this._extractKeywordsFallback(query);
    
    return {
      keywords,
      extractedFilters: {},
      embedding: [],
      confidenceScore: 0,
      processingTime: 0,
      intentSummary: 'Fallback processing - AI engine unavailable',
      aiProcessed: false,
      fallbackReason: error.message,
      fallbackUsed: true
    };
  }

  /**
   * Simple keyword extraction fallback
   * @param {string} query - Query to extract keywords from
   * @returns {Array} Extracted keywords
   * @private
   */
  _extractKeywordsFallback(query) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    // Simple tokenization and filtering
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'หา', 'ใน', 'ที่', 'และ', 'หรือ', 'กับ', 'ของ', 'ไป', 'มา', 'จาก', 'ถึง'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s\u0E00-\u0E7F]/g, ' ') // Keep alphanumeric and Thai characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to 10 keywords
  }
}

module.exports = AISearchService;