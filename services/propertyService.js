const PropertyRepository = require('../repositories/propertyRepository');
const SearchService = require('./searchService');
const SemanticSearchService = require('./semanticSearchService');
const EmbeddingService = require('./embeddingService');
const { 
  NotFoundError, 
  ValidationError, 
  DatabaseError,
  AIServiceError 
} = require('../middleware/errors');
const logger = require('../middleware/logger');

/**
 * Property Service - Business logic layer for Property operations
 * Handles business rules, validation, and orchestration
 */
class PropertyService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
    this.searchService = new SearchService();
    this.semanticSearchService = new SemanticSearchService();
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Create a new property with business logic validation
   * @param {Object} propertyData - Property data to create
   * @returns {Promise<Object>} Created property
   */
  async createProperty(propertyData) {
    try {
      // Business logic: Ensure required fields are present
      this._validateRequiredFields(propertyData);

      // Business logic: Normalize and clean data
      const normalizedData = this._normalizePropertyData(propertyData);

      // Create property through repository
      const property = await this.propertyRepository.create(normalizedData);

      // Generate embedding for semantic search (async, don't wait)
      this._generateEmbeddingAsync(property._id.toString());

      return this._formatPropertyResponse(property);
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to create property');
    }
  }

  /**
   * Get property by ID
   * @param {string} id - Property ID
   * @returns {Promise<Object>} Property data
   */
  async getPropertyById(id) {
    try {
      if (!id) {
        throw new Error('Property ID is required');
      }

      const property = await this.propertyRepository.findById(id);
      
      if (!property) {
        const error = new Error('Property not found');
        error.code = 'PROPERTY_NOT_FOUND';
        throw error;
      }

      return this._formatPropertyResponse(property);
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to get property');
    }
  }

  /**
   * Get all properties with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Properties list with metadata
   */
  async getAllProperties(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status = 'available',
        propertyType,
        minPrice,
        maxPrice,
        minArea,
        maxArea,
        bedrooms,
        bathrooms
      } = options;

      // Build filters
      const filters = { status };
      
      if (propertyType) {
        filters.propertyType = propertyType;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filters.price = {};
        if (minPrice !== undefined) {filters.price.$gte = minPrice;}
        if (maxPrice !== undefined) {filters.price.$lte = maxPrice;}
      }

      if (minArea !== undefined || maxArea !== undefined) {
        filters.area = {};
        if (minArea !== undefined) {filters.area.$gte = minArea;}
        if (maxArea !== undefined) {filters.area.$lte = maxArea;}
      }

      if (bedrooms !== undefined) {
        filters['rooms.bedrooms'] = bedrooms;
      }

      if (bathrooms !== undefined) {
        filters['rooms.bathrooms'] = bathrooms;
      }

      // Build query options
      const queryOptions = {
        limit: Math.min(limit, 100), // Max 100 items per page
        skip: (page - 1) * limit,
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
      };

      const result = await this.propertyRepository.findAll(filters, queryOptions);

      return {
        properties: result.properties.map(property => this._formatPropertyResponse(property)),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.total / limit),
          totalItems: result.total,
          itemsPerPage: limit,
          hasNextPage: result.hasMore,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to get properties');
    }
  }

  /**
   * Update property by ID
   * @param {string} id - Property ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated property
   */
  async updateProperty(id, updateData) {
    try {
      if (!id) {
        throw new Error('Property ID is required');
      }

      // Check if property exists
      const exists = await this.propertyRepository.existsById(id);
      if (!exists) {
        const error = new Error('Property not found');
        error.code = 'PROPERTY_NOT_FOUND';
        throw error;
      }

      // Business logic: Don't allow updating certain fields
      const allowedFields = [
        'title', 'description', 'price', 'propertyType', 'area',
        'rooms', 'location', 'features', 'status', 'images', 'contact'
      ];

      const filteredUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      // Normalize data
      const normalizedData = this._normalizePropertyData(filteredUpdateData);

      const updatedProperty = await this.propertyRepository.updateById(id, normalizedData);

      // Update embedding if content changed (async, don't wait)
      this._updateEmbeddingAsync(id, filteredUpdateData);

      return this._formatPropertyResponse(updatedProperty);
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to update property');
    }
  }

  /**
   * Delete property by ID
   * @param {string} id - Property ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteProperty(id) {
    try {
      if (!id) {
        throw new Error('Property ID is required');
      }

      const deletedProperty = await this.propertyRepository.deleteById(id);
      
      if (!deletedProperty) {
        const error = new Error('Property not found');
        error.code = 'PROPERTY_NOT_FOUND';
        throw error;
      }

      return {
        success: true,
        message: 'Property deleted successfully',
        deletedProperty: this._formatPropertyResponse(deletedProperty)
      };
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to delete property');
    }
  }

  /**
   * Search properties with text, location, and filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchProperties(searchParams) {
    try {
      // Validate search parameters
      this._validateSearchParams(searchParams);

      // Use semantic search if enabled, otherwise fallback to regular search
      const useSemanticSearch = searchParams.useSemanticSearch !== false; // Default to true
      
      if (useSemanticSearch) {
        return await this.semanticSearchService.searchWithSemanticRanking(searchParams);
      } else {
        return await this.searchService.searchProperties(searchParams);
      }
    } catch (error) {
      throw this._handleServiceError(error, 'Property search failed');
    }
  }

  /**
   * Find properties similar to a given property
   * @param {string} propertyId - Property ID to find similar properties for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Similar properties
   */
  async findSimilarProperties(propertyId, options = {}) {
    try {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      // Use semantic similarity search by default
      const useSemanticSearch = options.useSemanticSearch !== false; // Default to true
      
      if (useSemanticSearch) {
        return await this.semanticSearchService.findSimilarPropertiesWithSemantics(propertyId, options);
      } else {
        return await this.searchService.findSimilarProperties(propertyId, options);
      }
    } catch (error) {
      throw this._handleServiceError(error, 'Similar properties search failed');
    }
  }

  /**
   * Get property statistics
   * @returns {Promise<Object>} Property statistics
   */
  async getPropertyStats() {
    try {
      const [
        totalProperties,
        availableProperties,
        soldProperties,
        rentedProperties,
        embeddingStats
      ] = await Promise.all([
        this.propertyRepository.count(),
        this.propertyRepository.count({ status: 'available' }),
        this.propertyRepository.count({ status: 'sold' }),
        this.propertyRepository.count({ status: 'rented' }),
        this.embeddingService.getEmbeddingStats()
      ]);

      return {
        total: totalProperties,
        available: availableProperties,
        sold: soldProperties,
        rented: rentedProperties,
        pending: totalProperties - availableProperties - soldProperties - rentedProperties,
        embeddings: embeddingStats
      };
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to get property statistics');
    }
  }

  /**
   * Generate embeddings for properties that don't have them
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation results
   */
  async generateMissingEmbeddings(options = {}) {
    try {
      // Find properties without embeddings
      const propertyIds = await this.embeddingService.findPropertiesWithoutEmbeddings(options);
      
      if (propertyIds.length === 0) {
        return {
          message: 'All properties already have embeddings',
          processed: 0
        };
      }

      // Generate embeddings in batch
      const results = await this.embeddingService.generateBatchEmbeddings(propertyIds, options);

      return {
        message: 'Embedding generation completed',
        ...results
      };
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to generate missing embeddings');
    }
  }

  /**
   * Calculate semantic similarity between properties
   * @param {string} propertyId1 - First property ID
   * @param {string} propertyId2 - Second property ID
   * @returns {Promise<Object>} Similarity result
   */
  async calculatePropertySimilarity(propertyId1, propertyId2) {
    try {
      if (!propertyId1 || !propertyId2) {
        throw new Error('Both property IDs are required');
      }

      // Get both properties
      const [property1, property2] = await Promise.all([
        this.propertyRepository.findById(propertyId1),
        this.propertyRepository.findById(propertyId2)
      ]);

      if (!property1 || !property2) {
        throw new Error('One or both properties not found');
      }

      // Check if both have embeddings
      if (!property1.embedding || property1.embedding.length === 0 ||
          !property2.embedding || property2.embedding.length === 0) {
        throw new Error('Both properties must have embeddings for similarity calculation');
      }

      // Calculate similarity
      const similarity = this.embeddingService.calculateCosineSimilarity(
        property1.embedding,
        property2.embedding
      );

      return {
        property1: {
          id: property1._id,
          title: property1.title
        },
        property2: {
          id: property2._id,
          title: property2.title
        },
        semanticSimilarity: Math.round(similarity * 100) / 100,
        similarityPercentage: Math.round(similarity * 100)
      };
    } catch (error) {
      throw this._handleServiceError(error, 'Failed to calculate property similarity');
    }
  }

  /**
   * Validate search parameters
   * @param {Object} searchParams - Search parameters to validate
   * @private
   */
  _validateSearchParams(searchParams) {
    if (!searchParams) {
      return; // Empty search is valid
    }

    const { location, filters, pagination } = searchParams;

    // Validate location parameters
    if (location) {
      if (location.coordinates) {
        if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
          const error = new Error('Location coordinates must be an array of [longitude, latitude]');
          error.code = 'INVALID_LOCATION_COORDINATES';
          throw error;
        }

        const [lng, lat] = location.coordinates;
        if (typeof lng !== 'number' || typeof lat !== 'number' || 
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          const error = new Error('Invalid coordinates: longitude must be between -180 and 180, latitude between -90 and 90');
          error.code = 'INVALID_COORDINATES_RANGE';
          throw error;
        }
      }

      if (location.radius && (typeof location.radius !== 'number' || location.radius <= 0 || location.radius > 100)) {
        const error = new Error('Search radius must be a positive number between 1 and 100 kilometers');
        error.code = 'INVALID_SEARCH_RADIUS';
        throw error;
      }
    }

    // Validate filters
    if (filters) {
      if (filters.minPrice !== undefined && (typeof filters.minPrice !== 'number' || filters.minPrice < 0)) {
        const error = new Error('Minimum price must be a non-negative number');
        error.code = 'INVALID_MIN_PRICE';
        throw error;
      }

      if (filters.maxPrice !== undefined && (typeof filters.maxPrice !== 'number' || filters.maxPrice < 0)) {
        const error = new Error('Maximum price must be a non-negative number');
        error.code = 'INVALID_MAX_PRICE';
        throw error;
      }

      if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
        const error = new Error('Minimum price cannot be greater than maximum price');
        error.code = 'INVALID_PRICE_RANGE';
        throw error;
      }
    }

    // Validate pagination
    if (pagination) {
      if (pagination.page !== undefined && (!Number.isInteger(pagination.page) || pagination.page < 1)) {
        const error = new Error('Page number must be a positive integer');
        error.code = 'INVALID_PAGE_NUMBER';
        throw error;
      }

      if (pagination.limit !== undefined && (!Number.isInteger(pagination.limit) || pagination.limit < 1 || pagination.limit > 50)) {
        const error = new Error('Page limit must be an integer between 1 and 50');
        error.code = 'INVALID_PAGE_LIMIT';
        throw error;
      }
    }
  }

  /**
   * Validate required fields for property creation
   * @param {Object} propertyData - Property data to validate
   * @private
   */
  _validateRequiredFields(propertyData) {
    const requiredFields = ['title', 'description', 'price', 'propertyType', 'area', 'location'];
    const missingFields = [];

    requiredFields.forEach(field => {
      if (!propertyData[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.details = missingFields;
      throw error;
    }

    // Validate location structure
    if (propertyData.location) {
      if (!propertyData.location.coordinates || !propertyData.location.address) {
        const error = new Error('Location must include coordinates and address');
        error.code = 'INVALID_LOCATION';
        throw error;
      }
    }
  }

  /**
   * Normalize and clean property data
   * @param {Object} propertyData - Raw property data
   * @returns {Object} Normalized property data
   * @private
   */
  _normalizePropertyData(propertyData) {
    const normalized = { ...propertyData };

    // Normalize strings
    if (normalized.title) {
      normalized.title = normalized.title.trim();
    }

    if (normalized.description) {
      normalized.description = normalized.description.trim();
    }

    // Normalize location
    if (normalized.location) {
      if (normalized.location.address) {
        normalized.location.address = normalized.location.address.trim();
      }
      if (normalized.location.district) {
        normalized.location.district = normalized.location.district.trim();
      }
      if (normalized.location.province) {
        normalized.location.province = normalized.location.province.trim();
      }
    }

    // Normalize features array
    if (normalized.features && Array.isArray(normalized.features)) {
      normalized.features = normalized.features
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0)
        .filter((feature, index, arr) => arr.indexOf(feature) === index); // Remove duplicates
    }

    // Normalize contact info
    if (normalized.contact) {
      if (normalized.contact.name) {
        normalized.contact.name = normalized.contact.name.trim();
      }
      if (normalized.contact.email) {
        normalized.contact.email = normalized.contact.email.trim().toLowerCase();
      }
      if (normalized.contact.phone) {
        normalized.contact.phone = normalized.contact.phone.replace(/[-\s]/g, '');
      }
    }

    return normalized;
  }

  /**
   * Format property response for API
   * @param {Object} property - Property document
   * @returns {Object} Formatted property
   * @private
   */
  _formatPropertyResponse(property) {
    if (!property) {return null;}

    const formatted = property.toObject();
    
    // Add computed fields
    formatted.formattedPrice = property.formattedPrice;
    formatted.pricePerSqm = property.pricePerSqm;

    return formatted;
  }

  /**
   * Handle service errors with proper error codes
   * @param {Error} error - Original error
   * @param {string} message - Context message
   * @returns {Error} Formatted error
   * @private
   */
  _handleServiceError(error, message) {
    // If error already has a code, preserve it
    if (error.code) {
      error.message = `${message}: ${error.message}`;
      return error;
    }

    // Add context to error message
    error.message = `${message}: ${error.message}`;
    return error;
  }

  /**
   * Generate embedding for property asynchronously (fire and forget)
   * @param {string} propertyId - Property ID
   * @private
   */
  _generateEmbeddingAsync(propertyId) {
    // Don't await - run in background
    this.embeddingService.generatePropertyEmbedding(propertyId)
      .catch(error => {
        console.warn(`Failed to generate embedding for property ${propertyId}:`, error.message);
      });
  }

  /**
   * Update embedding for property asynchronously (fire and forget)
   * @param {string} propertyId - Property ID
   * @param {Object} updatedFields - Updated fields
   * @private
   */
  _updateEmbeddingAsync(propertyId, updatedFields) {
    // Don't await - run in background
    this.embeddingService.updatePropertyEmbedding(propertyId, updatedFields)
      .catch(error => {
        
      });
  }
}

module.exports = PropertyService;