const PropertyService = require('../services/propertyService');
const { 
  asyncHandler, 
  NotFoundError, 
  ValidationError,
  DatabaseError 
} = require('../middleware/errors');
const logger = require('../middleware/logger');

/**
 * Property Controller - Handles HTTP requests and responses for Property operations
 * Manages request/response flow and delegates business logic to PropertyService
 */
class PropertyController {
  constructor() {
    this.propertyService = new PropertyService();
  }

  /**
   * Create a new property
   * POST /api/properties
   */
  createProperty = asyncHandler(async (req, res) => {
    const propertyData = req.body;
    const property = await this.propertyService.createProperty(propertyData);

    logger.info('Property created successfully', {
      requestId: req.requestId,
      propertyId: property._id,
      title: property.title,
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  });

  /**
   * Get property by ID
   * GET /api/properties/:id
   */
  getProperty = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const property = await this.propertyService.getPropertyById(id);

    if (!property) {
      throw new NotFoundError('Property');
    }

    res.status(200).json({
      success: true,
      data: property
    });
  });

  /**
   * Get all properties with filtering and pagination
   * GET /api/properties
   */
  getAllProperties = asyncHandler(async (req, res) => {
    const queryOptions = req.query;
    const result = await this.propertyService.getAllProperties(queryOptions);

    res.status(200).json({
      success: true,
      data: result.properties,
      pagination: result.pagination
    });
  });

  /**
   * Update property by ID
   * PUT /api/properties/:id
   */
  updateProperty = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const property = await this.propertyService.updateProperty(id, updateData);

    if (!property) {
      throw new NotFoundError('Property');
    }

    logger.info('Property updated successfully', {
      requestId: req.requestId,
      propertyId: id,
      updatedFields: Object.keys(updateData),
    });

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  });

  /**
   * Delete property by ID
   * DELETE /api/properties/:id
   */
  deleteProperty = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.propertyService.deleteProperty(id);

    if (!result.deletedProperty) {
      throw new NotFoundError('Property');
    }

    logger.info('Property deleted successfully', {
      requestId: req.requestId,
      propertyId: id,
      title: result.deletedProperty.title,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.deletedProperty
    });
  });

  /**
   * Search properties with text, location, and filters
   * POST /api/properties/search
   */
  searchProperties = asyncHandler(async (req, res) => {
    const searchParams = {
      ...req.body,
      // Allow query parameter to override body parameter
      useSemanticSearch: req.query.useSemanticSearch !== undefined 
        ? req.query.useSemanticSearch === 'true'
        : req.body.useSemanticSearch
    };
    
    const result = await this.propertyService.searchProperties(searchParams);

    logger.info('Property search completed', {
      requestId: req.requestId,
      query: searchParams.query,
      resultsCount: result.properties.length,
      useSemanticSearch: searchParams.useSemanticSearch,
    });

    res.status(200).json({
      success: true,
      data: result.properties,
      pagination: result.pagination,
      searchMeta: result.searchMeta
    });
  });

  /**
   * Get property statistics
   * GET /api/properties/stats
   */
  getPropertyStats = asyncHandler(async (req, res) => {
    const stats = await this.propertyService.getPropertyStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  /**
   * Find properties similar to a given property
   * GET /api/properties/:id/similar
   */
  getSimilarProperties = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      limit = 10, 
      threshold = 0.7, 
      useSemanticSearch = 'true',
      includeScores = 'false'
    } = req.query;
    
    const options = {
      limit: parseInt(limit),
      threshold: parseFloat(threshold),
      useSemanticSearch: useSemanticSearch === 'true',
      includeScores: includeScores === 'true'
    };

    const result = await this.propertyService.findSimilarProperties(id, options);

    if (!result.targetProperty) {
      throw new NotFoundError('Property');
    }

    res.status(200).json({
      success: true,
      data: result.similarProperties,
      targetProperty: result.targetProperty,
      searchMeta: result.searchMeta
    });
  });

  /**
   * Generate embeddings for properties that don't have them
   * POST /api/properties/generate-embeddings
   */
  generateEmbeddings = asyncHandler(async (req, res) => {
    const { batchSize = 10, continueOnError = true } = req.body;
    
    const options = {
      batchSize: parseInt(batchSize),
      continueOnError: continueOnError === true
    };

    const result = await this.propertyService.generateMissingEmbeddings(options);

    logger.info('Embedding generation completed', {
      requestId: req.requestId,
      totalProcessed: result.totalProcessed,
      successful: result.successful?.length || 0,
      failed: result.failed?.length || 0,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        totalProcessed: result.totalProcessed,
        successful: result.successful?.length || 0,
        failed: result.failed?.length || 0,
        successRate: result.successful && result.totalProcessed 
          ? `${Math.round((result.successful.length / result.totalProcessed) * 100)}%`
          : '0%'
      },
      details: {
        successful: result.successful || [],
        failed: result.failed || []
      }
    });
  });

  /**
   * Calculate semantic similarity between two properties
   * GET /api/properties/:id1/similarity/:id2
   */
  calculateSimilarity = asyncHandler(async (req, res) => {
    const { id1, id2 } = req.params;
    
    const result = await this.propertyService.calculatePropertySimilarity(id1, id2);

    res.status(200).json({
      success: true,
      data: result
    });
  });


}

module.exports = PropertyController;