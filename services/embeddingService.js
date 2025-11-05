const PropertyRepository = require('../repositories/propertyRepository');
const AISearchService = require('./aiSearchService');
const winston = require('winston');

/**
 * Embedding Service - Manages property embeddings for semantic search
 * Generates, stores, and updates embeddings for properties
 */
class EmbeddingService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
    this.aiSearchService = new AISearchService();
    
    // Configure logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'embedding-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Generate and store embedding for a property
   * @param {string} propertyId - Property ID
   * @returns {Promise<Array>} Generated embedding vector
   */
  async generatePropertyEmbedding(propertyId) {
    try {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      // Get property data
      const property = await this.propertyRepository.findById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Create text representation for embedding
      const embeddingText = this._createEmbeddingText(property);
      
      this.logger.info('Generating embedding for property', {
        propertyId,
        textLength: embeddingText.length
      });

      // Generate embedding using AI service
      const embedding = await this.aiSearchService.generateEmbedding(embeddingText);
      
      if (!embedding || embedding.length === 0) {
        throw new Error('Failed to generate embedding - empty result');
      }

      // Store embedding in property document
      await this.propertyRepository.updateById(propertyId, { embedding });

      this.logger.info('Embedding generated and stored successfully', {
        propertyId,
        embeddingDimensions: embedding.length
      });

      return embedding;

    } catch (error) {
      this.logger.error('Failed to generate property embedding', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple properties in batch
   * @param {Array} propertyIds - Array of property IDs
   * @param {Object} options - Batch processing options
   * @returns {Promise<Object>} Batch processing results
   */
  async generateBatchEmbeddings(propertyIds, options = {}) {
    const { batchSize = 10, continueOnError = true } = options;
    
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      throw new Error('Property IDs array is required');
    }

    this.logger.info('Starting batch embedding generation', {
      totalProperties: propertyIds.length,
      batchSize
    });

    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0
    };

    // Process in batches to avoid overwhelming the AI service
    for (let i = 0; i < propertyIds.length; i += batchSize) {
      const batch = propertyIds.slice(i, i + batchSize);
      
      this.logger.info('Processing batch', {
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        progress: `${i + batch.length}/${propertyIds.length}`
      });

      // Process batch with concurrent requests
      const batchPromises = batch.map(async (propertyId) => {
        try {
          const embedding = await this.generatePropertyEmbedding(propertyId);
          results.successful.push({ propertyId, embeddingDimensions: embedding.length });
          return { propertyId, success: true };
        } catch (error) {
          const failureInfo = { propertyId, error: error.message };
          results.failed.push(failureInfo);
          
          if (!continueOnError) {
            throw error;
          }
          
          return { propertyId, success: false, error: error.message };
        }
      });

      await Promise.all(batchPromises);
      results.totalProcessed += batch.length;

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < propertyIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.info('Batch embedding generation completed', {
      totalProcessed: results.totalProcessed,
      successful: results.successful.length,
      failed: results.failed.length,
      successRate: `${Math.round((results.successful.length / results.totalProcessed) * 100)}%`
    });

    return results;
  }

  /**
   * Update embedding for a property when its content changes
   * @param {string} propertyId - Property ID
   * @param {Object} updatedFields - Fields that were updated
   * @returns {Promise<Array>} Updated embedding vector
   */
  async updatePropertyEmbedding(propertyId, updatedFields = {}) {
    try {
      // Check if embedding-relevant fields were updated
      const embeddingFields = ['title', 'description', 'features', 'location.address'];
      const needsUpdate = embeddingFields.some(field => {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return updatedFields[parent] && updatedFields[parent][child] !== undefined;
        }
        return updatedFields[field] !== undefined;
      });

      if (!needsUpdate) {
        this.logger.debug('No embedding update needed', { propertyId });
        return null;
      }

      this.logger.info('Updating property embedding due to content changes', {
        propertyId,
        updatedFields: Object.keys(updatedFields)
      });

      return await this.generatePropertyEmbedding(propertyId);

    } catch (error) {
      this.logger.error('Failed to update property embedding', {
        propertyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find properties without embeddings
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Properties without embeddings
   */
  async findPropertiesWithoutEmbeddings(options = {}) {
    try {
      const { limit = 100, status = 'available' } = options;

      const filters = {
        status,
        $or: [
          { embedding: { $exists: false } },
          { embedding: { $size: 0 } },
          { embedding: null }
        ]
      };

      const result = await this.propertyRepository.findAll(filters, { limit });
      
      this.logger.info('Found properties without embeddings', {
        count: result.properties.length,
        status
      });

      return result.properties.map(property => property._id.toString());

    } catch (error) {
      this.logger.error('Failed to find properties without embeddings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Cosine similarity score (0-1)
   */
  calculateCosineSimilarity(embedding1, embedding2) {
    try {
      if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
        throw new Error('Both embeddings must be arrays');
      }

      if (embedding1.length === 0 || embedding2.length === 0) {
        return 0;
      }

      if (embedding1.length !== embedding2.length) {
        throw new Error('Embeddings must have the same dimensions');
      }

      // Calculate dot product
      let dotProduct = 0;
      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
      }

      // Calculate magnitudes
      let magnitude1 = 0;
      let magnitude2 = 0;
      for (let i = 0; i < embedding1.length; i++) {
        magnitude1 += embedding1[i] * embedding1[i];
        magnitude2 += embedding2[i] * embedding2[i];
      }

      magnitude1 = Math.sqrt(magnitude1);
      magnitude2 = Math.sqrt(magnitude2);

      // Avoid division by zero
      if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
      }

      // Calculate cosine similarity
      const similarity = dotProduct / (magnitude1 * magnitude2);
      
      // Ensure result is between 0 and 1 (handle floating point precision issues)
      return Math.max(0, Math.min(1, similarity));

    } catch (error) {
      this.logger.error('Failed to calculate cosine similarity', {
        error: error.message,
        embedding1Length: embedding1?.length,
        embedding2Length: embedding2?.length
      });
      return 0;
    }
  }

  /**
   * Get embedding statistics for monitoring
   * @returns {Promise<Object>} Embedding statistics
   */
  async getEmbeddingStats() {
    try {
      const [
        totalProperties,
        propertiesWithEmbeddings,
        propertiesWithoutEmbeddings
      ] = await Promise.all([
        this.propertyRepository.count({ status: 'available' }),
        this.propertyRepository.count({ 
          status: 'available',
          embedding: { $exists: true, $ne: [], $ne: null }
        }),
        this.propertyRepository.count({
          status: 'available',
          $or: [
            { embedding: { $exists: false } },
            { embedding: { $size: 0 } },
            { embedding: null }
          ]
        })
      ]);

      const coveragePercentage = totalProperties > 0 
        ? Math.round((propertiesWithEmbeddings / totalProperties) * 100)
        : 0;

      return {
        totalProperties,
        propertiesWithEmbeddings,
        propertiesWithoutEmbeddings,
        coveragePercentage,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get embedding statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create text representation of property for embedding generation
   * @param {Object} property - Property document
   * @returns {string} Text representation for embedding
   * @private
   */
  _createEmbeddingText(property) {
    const textParts = [];

    // Add title (highest weight)
    if (property.title) {
      textParts.push(property.title);
    }

    // Add description (high weight)
    if (property.description) {
      textParts.push(property.description);
    }

    // Add property type and basic info
    if (property.propertyType) {
      textParts.push(`Property type: ${property.propertyType}`);
    }

    if (property.area) {
      textParts.push(`Area: ${property.area} square meters`);
    }

    if (property.price) {
      textParts.push(`Price: ${property.price} THB`);
    }

    // Add room information
    if (property.rooms) {
      if (property.rooms.bedrooms) {
        textParts.push(`${property.rooms.bedrooms} bedrooms`);
      }
      if (property.rooms.bathrooms) {
        textParts.push(`${property.rooms.bathrooms} bathrooms`);
      }
    }

    // Add location information
    if (property.location) {
      if (property.location.address) {
        textParts.push(`Address: ${property.location.address}`);
      }
      if (property.location.district) {
        textParts.push(`District: ${property.location.district}`);
      }
      if (property.location.province) {
        textParts.push(`Province: ${property.location.province}`);
      }
    }

    // Add features
    if (property.features && Array.isArray(property.features) && property.features.length > 0) {
      textParts.push(`Features: ${property.features.join(', ')}`);
    }

    return textParts.join('. ');
  }
}

module.exports = EmbeddingService;