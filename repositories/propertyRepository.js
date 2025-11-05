const Property = require('../models/Property');

/**
 * Property Repository - Data access layer for Property operations
 * Handles all database interactions for Property entities
 */
class PropertyRepository {
  /**
   * Create a new property
   * @param {Object} propertyData - Property data to create
   * @returns {Promise<Object>} Created property
   */
  async create(propertyData) {
    try {
      const property = new Property(propertyData);
      return await property.save();
    } catch (error) {
      throw this._handleError(error, 'Failed to create property');
    }
  }

  /**
   * Find property by ID
   * @param {string} id - Property ID
   * @returns {Promise<Object|null>} Property or null if not found
   */
  async findById(id) {
    try {
      return await Property.findById(id);
    } catch (error) {
      throw this._handleError(error, 'Failed to find property by ID');
    }
  }

  /**
   * Find all properties with optional filters and pagination
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options (limit, skip, sort)
   * @returns {Promise<Object>} Properties and metadata
   */
  async findAll(filters = {}, options = {}) {
    try {
      const {
        limit = 20,
        skip = 0,
        sort = { createdAt: -1 },
        select = null
      } = options;

      const query = Property.find(filters);
      
      if (select) {
        query.select(select);
      }

      const [properties, total] = await Promise.all([
        query
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .exec(),
        Property.countDocuments(filters)
      ]);

      return {
        properties,
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      };
    } catch (error) {
      throw this._handleError(error, 'Failed to find properties');
    }
  }

  /**
   * Update property by ID
   * @param {string} id - Property ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} Updated property or null if not found
   */
  async updateById(id, updateData) {
    try {
      return await Property.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { 
          new: true, 
          runValidators: true,
          context: 'query'
        }
      );
    } catch (error) {
      throw this._handleError(error, 'Failed to update property');
    }
  }

  /**
   * Delete property by ID
   * @param {string} id - Property ID
   * @returns {Promise<Object|null>} Deleted property or null if not found
   */
  async deleteById(id) {
    try {
      return await Property.findByIdAndDelete(id);
    } catch (error) {
      throw this._handleError(error, 'Failed to delete property');
    }
  }

  /**
   * Check if property exists by ID
   * @param {string} id - Property ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async existsById(id) {
    try {
      const count = await Property.countDocuments({ _id: id });
      return count > 0;
    } catch (error) {
      throw this._handleError(error, 'Failed to check property existence');
    }
  }

  /**
   * Find properties by multiple IDs
   * @param {Array<string>} ids - Array of property IDs
   * @returns {Promise<Array>} Array of properties
   */
  async findByIds(ids) {
    try {
      return await Property.find({ _id: { $in: ids } });
    } catch (error) {
      throw this._handleError(error, 'Failed to find properties by IDs');
    }
  }

  /**
   * Update multiple properties
   * @param {Object} filter - Filter criteria
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateMany(filter, updateData) {
    try {
      return await Property.updateMany(
        filter,
        { ...updateData, updatedAt: new Date() },
        { runValidators: true }
      );
    } catch (error) {
      throw this._handleError(error, 'Failed to update multiple properties');
    }
  }

  /**
   * Delete multiple properties
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(filter) {
    try {
      return await Property.deleteMany(filter);
    } catch (error) {
      throw this._handleError(error, 'Failed to delete multiple properties');
    }
  }

  /**
   * Get properties count with optional filters
   * @param {Object} filters - Query filters
   * @returns {Promise<number>} Count of properties
   */
  async count(filters = {}) {
    try {
      return await Property.countDocuments(filters);
    } catch (error) {
      throw this._handleError(error, 'Failed to count properties');
    }
  }

  /**
   * Execute aggregation pipeline
   * @param {Array} pipeline - MongoDB aggregation pipeline
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(pipeline) {
    try {
      return await Property.aggregate(pipeline);
    } catch (error) {
      throw this._handleError(error, 'Failed to execute aggregation');
    }
  }

  /**
   * Handle database errors and provide meaningful error messages
   * @param {Error} error - Original error
   * @param {string} message - Context message
   * @returns {Error} Formatted error
   * @private
   */
  _handleError(error, message) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      const formattedError = new Error(`${message}: ${validationErrors.join(', ')}`);
      formattedError.code = 'VALIDATION_ERROR';
      formattedError.details = validationErrors;
      return formattedError;
    }

    if (error.name === 'CastError') {
      const formattedError = new Error(`${message}: Invalid ID format`);
      formattedError.code = 'INVALID_ID';
      return formattedError;
    }

    if (error.code === 11000) {
      const formattedError = new Error(`${message}: Duplicate entry`);
      formattedError.code = 'DUPLICATE_ENTRY';
      return formattedError;
    }

    // For other errors, preserve original error but add context
    error.message = `${message}: ${error.message}`;
    return error;
  }
}

module.exports = PropertyRepository;