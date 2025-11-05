const PropertyRepository = require('../repositories/propertyRepository');

/**
 * Search Service - Handles property search functionality
 * Provides text search, geospatial search, and filtering capabilities
 */
class SearchService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
  }

  /**
   * Perform comprehensive property search with text, location, and filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchProperties(searchParams = {}) {
    try {
      const {
        query: searchText,
        location,
        filters = {},
        pagination = {},
        sortBy = 'relevance'
      } = searchParams;

      // Build MongoDB aggregation pipeline
      const pipeline = [];

      // Stage 1: Match stage for basic filtering
      const matchStage = this._buildMatchStage(filters);
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      // Stage 2: Add text search scoring if search text provided
      if (searchText && searchText.trim()) {
        pipeline.unshift({
          $match: {
            $text: { $search: searchText.trim() }
          }
        });
        
        // Add text score for relevance sorting
        pipeline.push({
          $addFields: {
            textScore: { $meta: 'textScore' }
          }
        });
      }

      // Stage 3: Add geospatial search and distance calculation
      if (location && location.coordinates) {
        const geoStage = this._buildGeoNearStage(location);
        // $geoNear must be the first stage, so we need to restructure
        if (pipeline.length > 0) {
          // If we have other stages, we need to use $geoWithin instead
          const geoFilter = this._buildGeoWithinFilter(location);
          if (pipeline[0].$match) {
            pipeline[0].$match = { ...pipeline[0].$match, ...geoFilter };
          } else {
            pipeline.unshift({ $match: geoFilter });
          }
          
          // Add distance calculation
          pipeline.push({
            $addFields: {
              distance: {
                $divide: [
                  {
                    $sqrt: {
                      $add: [
                        {
                          $pow: [
                            {
                              $multiply: [
                                { $subtract: [{ $arrayElemAt: ['$location.coordinates', 0] }, location.coordinates[0]] },
                                111320 // meters per degree longitude at equator
                              ]
                            },
                            2
                          ]
                        },
                        {
                          $pow: [
                            {
                              $multiply: [
                                { $subtract: [{ $arrayElemAt: ['$location.coordinates', 1] }, location.coordinates[1]] },
                                110540 // meters per degree latitude
                              ]
                            },
                            2
                          ]
                        }
                      ]
                    }
                  },
                  1000 // convert to kilometers
                ]
              }
            }
          });
        } else {
          // Use $geoNear as first stage for better performance
          pipeline.unshift(geoStage);
        }
      }

      // Stage 4: Calculate relevance score
      pipeline.push({
        $addFields: {
          relevanceScore: this._buildRelevanceScore(searchText, location)
        }
      });

      // Stage 5: Sort results
      const sortStage = this._buildSortStage(sortBy, searchText, location);
      pipeline.push({ $sort: sortStage });

      // Execute search with pagination
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      // Add pagination stages
      const paginationPipeline = [
        ...pipeline,
        { $skip: skip },
        { $limit: Math.min(limit, 50) } // Max 50 results per page
      ];

      // Execute both search and count queries
      const [searchResults, totalResults] = await Promise.all([
        this.propertyRepository.aggregate(paginationPipeline),
        this._getSearchCount(pipeline)
      ]);

      // Format results
      const formattedResults = searchResults.map(property => 
        this._formatSearchResult(property, searchText, location)
      );

      return {
        properties: formattedResults,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalResults / limit),
          totalResults,
          itemsPerPage: limit,
          hasNextPage: skip + limit < totalResults,
          hasPreviousPage: page > 1
        },
        searchMeta: {
          hasTextSearch: !!searchText,
          hasLocationSearch: !!(location && location.coordinates),
          appliedFilters: this._getAppliedFilters(filters),
          sortBy
        }
      };

    } catch (error) {
      throw this._handleSearchError(error, 'Property search failed');
    }
  }

  /**
   * Build match stage for filtering
   * @param {Object} filters - Filter parameters
   * @returns {Object} MongoDB match query
   * @private
   */
  _buildMatchStage(filters) {
    const match = {};

    // Status filter (default to available)
    match.status = filters && filters.status !== undefined ? filters.status : 'available';

    // Property type filter
    if (filters.propertyType) {
      if (Array.isArray(filters.propertyType)) {
        match.propertyType = { $in: filters.propertyType };
      } else {
        match.propertyType = filters.propertyType;
      }
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      match.price = {};
      if (filters.minPrice !== undefined) match.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) match.price.$lte = filters.maxPrice;
    }

    // Area range filter
    if (filters.minArea !== undefined || filters.maxArea !== undefined) {
      match.area = {};
      if (filters.minArea !== undefined) match.area.$gte = filters.minArea;
      if (filters.maxArea !== undefined) match.area.$lte = filters.maxArea;
    }

    // Room filters
    if (filters.bedrooms !== undefined) {
      match['rooms.bedrooms'] = filters.bedrooms;
    }

    if (filters.bathrooms !== undefined) {
      match['rooms.bathrooms'] = { $gte: filters.bathrooms };
    }

    // Features filter
    if (filters.features && Array.isArray(filters.features) && filters.features.length > 0) {
      match.features = { $in: filters.features };
    }

    return match;
  }

  /**
   * Build $geoNear stage for geospatial search
   * @param {Object} location - Location parameters
   * @returns {Object} MongoDB $geoNear stage
   * @private
   */
  _buildGeoNearStage(location) {
    const { coordinates, radius = 10 } = location; // Default 10km radius
    
    return {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: coordinates // [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: radius * 1000, // Convert km to meters
        spherical: true,
        distanceMultiplier: 0.001 // Convert meters to kilometers
      }
    };
  }

  /**
   * Build $geoWithin filter for geospatial search when $geoNear can't be used
   * @param {Object} location - Location parameters
   * @returns {Object} MongoDB geospatial filter
   * @private
   */
  _buildGeoWithinFilter(location) {
    const { coordinates, radius = 10 } = location;
    
    return {
      location: {
        $geoWithin: {
          $centerSphere: [coordinates, radius / 6378.1] // radius in radians
        }
      }
    };
  }

  /**
   * Build relevance score calculation
   * @param {string} searchText - Search query text
   * @param {Object} location - Location parameters
   * @returns {Object} MongoDB expression for relevance score
   * @private
   */
  _buildRelevanceScore(searchText, location) {
    const scoreComponents = [];

    // Text relevance score (0-1)
    if (searchText) {
      scoreComponents.push({
        $multiply: [
          { $ifNull: ['$textScore', 0] },
          0.4 // 40% weight for text relevance
        ]
      });
    }

    // Location proximity score (0-1)
    if (location && location.coordinates) {
      scoreComponents.push({
        $multiply: [
          {
            $subtract: [
              1,
              {
                $min: [
                  { $divide: [{ $ifNull: ['$distance', 50] }, 50] }, // Normalize to 50km max
                  1
                ]
              }
            ]
          },
          0.3 // 30% weight for location proximity
        ]
      });
    }

    // Price competitiveness score (0-1) - lower price = higher score
    scoreComponents.push({
      $multiply: [
        {
          $subtract: [
            1,
            {
              $min: [
                { $divide: ['$price', 10000000] }, // Normalize to 10M THB max
                1
              ]
            }
          ]
        },
        0.2 // 20% weight for price competitiveness
      ]
    });

    // Recency score (0-1) - newer properties get higher score
    scoreComponents.push({
      $multiply: [
        {
          $subtract: [
            1,
            {
              $min: [
                {
                  $divide: [
                    { $subtract: [new Date(), '$createdAt'] },
                    31536000000 // 1 year in milliseconds
                  ]
                },
                1
              ]
            }
          ]
        },
        0.1 // 10% weight for recency
      ]
    });

    return scoreComponents.length > 1 ? { $add: scoreComponents } : scoreComponents[0];
  }

  /**
   * Build sort stage based on sort criteria
   * @param {string} sortBy - Sort criteria
   * @param {string} searchText - Search query text
   * @param {Object} location - Location parameters
   * @returns {Object} MongoDB sort object
   * @private
   */
  _buildSortStage(sortBy, searchText, location) {
    switch (sortBy) {
    case 'relevance':
      return { relevanceScore: -1, createdAt: -1 };
    case 'price_asc':
      return { price: 1, createdAt: -1 };
    case 'price_desc':
      return { price: -1, createdAt: -1 };
    case 'area_asc':
      return { area: 1, createdAt: -1 };
    case 'area_desc':
      return { area: -1, createdAt: -1 };
    case 'distance':
      return location ? { distance: 1, createdAt: -1 } : { createdAt: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    default:
      return { relevanceScore: -1, createdAt: -1 };
    }
  }

  /**
   * Get total count for search results
   * @param {Array} pipeline - Aggregation pipeline without pagination
   * @returns {Promise<number>} Total count
   * @private
   */
  async _getSearchCount(pipeline) {
    const countPipeline = [
      ...pipeline,
      { $count: 'total' }
    ];

    const result = await this.propertyRepository.aggregate(countPipeline);
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Format search result for API response
   * @param {Object} property - Property document
   * @param {string} searchText - Search query text
   * @param {Object} location - Location parameters
   * @returns {Object} Formatted property result
   * @private
   */
  _formatSearchResult(property, searchText, location) {
    const formatted = {
      id: property._id,
      title: property.title,
      description: property.description,
      price: property.price,
      formattedPrice: new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0
      }).format(property.price),
      propertyType: property.propertyType,
      area: property.area,
      pricePerSqm: Math.round(property.price / property.area),
      rooms: property.rooms,
      location: {
        coordinates: property.location.coordinates,
        address: property.location.address,
        district: property.location.district,
        province: property.location.province
      },
      features: property.features,
      status: property.status,
      images: property.images,
      contact: property.contact,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    };

    // Add search-specific fields
    if (property.relevanceScore !== undefined) {
      formatted.relevanceScore = Math.round(property.relevanceScore * 100) / 100;
    }

    if (property.textScore !== undefined) {
      formatted.textScore = Math.round(property.textScore * 100) / 100;
    }

    if (property.distance !== undefined) {
      formatted.distance = Math.round(property.distance * 100) / 100; // Round to 2 decimal places
    }

    return formatted;
  }

  /**
   * Get applied filters summary
   * @param {Object} filters - Filter parameters
   * @returns {Object} Applied filters summary
   * @private
   */
  _getAppliedFilters(filters) {
    const applied = {};

    if (filters.propertyType) applied.propertyType = filters.propertyType;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      applied.priceRange = {
        min: filters.minPrice,
        max: filters.maxPrice
      };
    }
    if (filters.minArea !== undefined || filters.maxArea !== undefined) {
      applied.areaRange = {
        min: filters.minArea,
        max: filters.maxArea
      };
    }
    if (filters.bedrooms !== undefined) applied.bedrooms = filters.bedrooms;
    if (filters.bathrooms !== undefined) applied.bathrooms = filters.bathrooms;
    if (filters.features) applied.features = filters.features;
    if (filters.status) applied.status = filters.status;

    return applied;
  }

  /**
   * Handle search errors with proper error codes
   * @param {Error} error - Original error
   * @param {string} message - Context message
   * @returns {Error} Formatted error
   * @private
   */
  _handleSearchError(error, message) {
    if (error.name === 'ValidationError') {
      const formattedError = new Error(`${message}: Invalid search parameters`);
      formattedError.code = 'SEARCH_VALIDATION_ERROR';
      formattedError.details = error.message;
      return formattedError;
    }

    if (error.message && error.message.includes('text index')) {
      const formattedError = new Error(`${message}: Text search not available`);
      formattedError.code = 'TEXT_INDEX_ERROR';
      return formattedError;
    }

    if (error.message && error.message.includes('2dsphere')) {
      const formattedError = new Error(`${message}: Geospatial search not available`);
      formattedError.code = 'GEO_INDEX_ERROR';
      return formattedError;
    }

    // For other errors, preserve original error but add context
    error.message = `${message}: ${error.message}`;
    return error;
  }
}

module.exports = SearchService;