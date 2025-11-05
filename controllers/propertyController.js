const PropertyService = require('../services/propertyService');

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
  async createProperty(req, res) {
    try {
      const propertyData = req.body;
      const property = await this.propertyService.createProperty(propertyData);

      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        data: property
      });
    } catch (error) {
      this._handleError(res, error, 'Failed to create property');
    }
  }

  /**
   * Get property by ID
   * GET /api/properties/:id
   */
  async getProperty(req, res) {
    try {
      const { id } = req.params;
      const property = await this.propertyService.getPropertyById(id);

      res.status(200).json({
        success: true,
        data: property
      });
    } catch (error) {
      this._handleError(res, error, 'Failed to get property');
    }
  }

  /**
   * Get all properties with filtering and pagination
   * GET /api/properties
   */
  async getAllProperties(req, res) {
    try {
      const queryOptions = req.query;
      const result = await this.propertyService.getAllProperties(queryOptions);

      res.status(200).json({
        success: true,
        data: result.properties,
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error, 'Failed to get properties');
    }
  }

  /**
   * Update property by ID
   * PUT /api/properties/:id
   */
  async updateProperty(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const property = await this.propertyService.updateProperty(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: property
      });
    } catch (error) {
      this._handleError(res, error, 'Failed to update property');
    }
  }

  /**
   * Delete property by ID
   * DELETE /api/properties/:id
   */
  async deleteProperty(req, res) {
    try {
      const { id } = req.params;
      const result = await this.propertyService.deleteProperty(id);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.deletedProperty
      });
    } catch (error) {
      this._handleError(res, error, 'Failed to delete property');
    }
  }

  /**
   * Search properties with text, location, and filters
   * POST /api/properties/search
   */
  async searchProperties(req, res) {
    try {
      const searchParams = req.body;
      const result = await this.propertyService.searchProperties(searchParams);

      res.status(200).json({
        success: true,
        data: result.properties,
        pagination: result.pagination,
        searchMeta: result.searchMeta
      });
    } catch (error) {
      this._handleError(res, error, 'Property search failed');
    }
  }

  /**
   * Get property statistics
   * GET /api/properties/stats
   */
  async getPropertyStats(req, res) {
    try {
      const stats = await this.propertyService.getPropertyStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this._handleError(res, error, 'Failed to get property statistics');
    }
  }

  /**
   * Handle errors and send appropriate HTTP responses
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @private
   */
  _handleError(res, error, defaultMessage) {
    // Log error for debugging
    console.error(`${defaultMessage}:`, error);

    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = defaultMessage;

    // Handle specific error types
    switch (error.code) {
      case 'PROPERTY_NOT_FOUND':
        statusCode = 404;
        errorCode = 'PROPERTY_NOT_FOUND';
        message = 'Property not found';
        break;

      case 'VALIDATION_ERROR':
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Invalid input data';
        break;

      case 'MISSING_REQUIRED_FIELDS':
        statusCode = 400;
        errorCode = 'MISSING_REQUIRED_FIELDS';
        message = error.message;
        break;

      case 'INVALID_LOCATION':
        statusCode = 400;
        errorCode = 'INVALID_LOCATION';
        message = error.message;
        break;

      case 'INVALID_ID':
        statusCode = 400;
        errorCode = 'INVALID_ID';
        message = 'Invalid property ID format';
        break;

      case 'DUPLICATE_ENTRY':
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'Property already exists';
        break;

      case 'SEARCH_VALIDATION_ERROR':
      case 'INVALID_LOCATION_COORDINATES':
      case 'INVALID_COORDINATES_RANGE':
      case 'INVALID_SEARCH_RADIUS':
      case 'INVALID_MIN_PRICE':
      case 'INVALID_MAX_PRICE':
      case 'INVALID_PRICE_RANGE':
      case 'INVALID_PAGE_NUMBER':
      case 'INVALID_PAGE_LIMIT':
        statusCode = 400;
        errorCode = error.code;
        message = error.message;
        break;

      case 'TEXT_INDEX_ERROR':
      case 'GEO_INDEX_ERROR':
        statusCode = 503;
        errorCode = error.code;
        message = error.message;
        break;

      default:
        // For unknown errors, use default values
        message = process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred';
        break;
    }

    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: message,
        timestamp: new Date().toISOString()
      }
    };

    // Add error details in development mode or for validation errors
    if (process.env.NODE_ENV === 'development' || error.details) {
      errorResponse.error.details = error.details || error.stack;
    }

    res.status(statusCode).json(errorResponse);
  }
}

module.exports = PropertyController;