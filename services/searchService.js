const PropertyRepository = require('../repositories/propertyRepository');
const AISearchService = require('./aiSearchService');
const EmbeddingService = require('./embeddingService');

/**
 * Search Service - Handles property search functionality
 * Provides text search, geospatial search, and filtering capabilities
 * Integrates with AI engine for natural language processing and semantic search
 */
class SearchService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
    this.aiSearchService = new AISearchService();
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Perform comprehensive property search with text, location, and filters
   * Uses AI processing for natural language queries when available
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchProperties(searchParams = {}) {
    try {
      let {
        query: searchText,
        location,
        filters = {},
        pagination = {},
        sortBy = 'relevance',
        useAI = true
      } = searchParams;

      let aiMeta = {
        processed: false,
        confidence: 0,
        processingTime: 0,
        fallbackUsed: false
      };

      // Process query with AI if enabled and query is natural language
      if (useAI && searchText && this._isNaturalLanguageQuery(searchText)) {
        try {
          const intentResult = await this.aiSearchService.processIntent(searchText);
          
          if (intentResult.aiProcessed) {
            // Extract AI-processed parameters
            const aiParams = this.aiSearchService.extractSearchParameters(intentResult);
            
            // Merge AI-extracted filters with existing filters
            filters = { ...filters, ...aiParams.filters };
            
            // Use AI-extracted location if not provided
            if (!location && aiParams.location) {
              location = aiParams.location;
            }
            
            // Use AI-processed keywords as search text
            if (aiParams.query) {
              searchText = aiParams.query;
            }
            
            // Store AI metadata
            aiMeta = aiParams.aiMeta;
            
            // Store embedding for semantic search
            if (aiParams.embedding && aiParams.embedding.length > 0) {
              searchParams.embedding = aiParams.embedding;
            }
          } else {
            // AI processing failed, use fallback
            aiMeta.fallbackUsed = true;
            aiMeta.fallbackReason = intentResult.fallbackReason;
          }
        } catch (aiError) {
          // AI service failed, continue with original query
          aiMeta.fallbackUsed = true;
          aiMeta.error = aiError.message;
        }
      }

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

      // Stage 4: Calculate relevance score (including semantic similarity if available)
      pipeline.push({
        $addFields: {
          relevanceScore: this._buildRelevanceScore(searchText, location, searchParams.embedding)
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
          sortBy,
          aiProcessing: aiMeta
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
   * @param {Array} queryEmbedding - Query embedding for semantic similarity
   * @returns {Object} MongoDB expression for relevance score
   * @private
   */
  _buildRelevanceScore(searchText, location, queryEmbedding) {
    const scoreComponents = [];

    // Text relevance score (0-1)
    if (searchText) {
      scoreComponents.push({
        $multiply: [
          { $ifNull: ['$textScore', 0] },
          queryEmbedding ? 0.2 : 0.4 // Reduce weight if we have semantic similarity
        ]
      });
    }

    // Semantic similarity score (0-1) - if embedding is available
    if (queryEmbedding && queryEmbedding.length > 0) {
      scoreComponents.push({
        $multiply: [
          {
            $cond: {
              if: { $and: [{ $isArray: '$embedding' }, { $gt: [{ $size: '$embedding' }, 0] }] },
              then: {
                // Calculate cosine similarity using MongoDB aggregation
                $let: {
                  vars: {
                    dotProduct: {
                      $sum: {
                        $map: {
                          input: { $range: [0, { $size: '$embedding' }] },
                          as: 'i',
                          in: {
                            $multiply: [
                              { $arrayElemAt: ['$embedding', '$$i'] },
                              { $arrayElemAt: [queryEmbedding, '$$i'] }
                            ]
                          }
                        }
                      }
                    },
                    normA: {
                      $sqrt: {
                        $sum: {
                          $map: {
                            input: '$embedding',
                            as: 'val',
                            in: { $multiply: ['$$val', '$$val'] }
                          }
                        }
                      }
                    },
                    normB: {
                      $sqrt: {
                        $sum: {
                          $map: {
                            input: queryEmbedding,
                            as: 'val',
                            in: { $multiply: ['$$val', '$$val'] }
                          }
                        }
                      }
                    }
                  },
                  in: {
                    $cond: {
                      if: { $and: [{ $gt: ['$$normA', 0] }, { $gt: ['$$normB', 0] }] },
                      then: { $divide: ['$$dotProduct', { $multiply: ['$$normA', '$$normB'] }] },
                      else: 0
                    }
                  }
                }
              },
              else: 0
            }
          },
          0.4 // 40% weight for semantic similarity
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
   * Perform semantic search for similar properties
   * @param {string} propertyId - Property ID to find similar properties for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Similar properties
   */
  async findSimilarProperties(propertyId, options = {}) {
    try {
      const { limit = 10, threshold = 0.7 } = options;

      // Get the target property
      const targetProperty = await this.propertyRepository.findById(propertyId);
      if (!targetProperty) {
        throw new Error('Property not found');
      }

      // Generate embedding for target property if not exists
      let targetEmbedding = targetProperty.embedding;
      if (!targetEmbedding || targetEmbedding.length === 0) {
        const description = `${targetProperty.title} ${targetProperty.description}`;
        targetEmbedding = await this.aiSearchService.generateEmbedding(description);
      }

      if (!targetEmbedding || targetEmbedding.length === 0) {
        // Fallback to feature-based similarity
        return this._findSimilarPropertiesFallback(targetProperty, options);
      }

      // Build aggregation pipeline for semantic similarity
      const pipeline = [
        {
          $match: {
            _id: { $ne: targetProperty._id },
            status: 'available',
            embedding: { $exists: true, $ne: [] }
          }
        },
        {
          $addFields: {
            semanticSimilarity: {
              // Calculate cosine similarity (same as in relevance score)
              $let: {
                vars: {
                  dotProduct: {
                    $sum: {
                      $map: {
                        input: { $range: [0, { $size: '$embedding' }] },
                        as: 'i',
                        in: {
                          $multiply: [
                            { $arrayElemAt: ['$embedding', '$$i'] },
                            { $arrayElemAt: [targetEmbedding, '$$i'] }
                          ]
                        }
                      }
                    }
                  },
                  normA: {
                    $sqrt: {
                      $sum: {
                        $map: {
                          input: '$embedding',
                          as: 'val',
                          in: { $multiply: ['$$val', '$$val'] }
                        }
                      }
                    }
                  },
                  normB: Math.sqrt(targetEmbedding.reduce((sum, val) => sum + val * val, 0))
                },
                in: {
                  $cond: {
                    if: { $gt: ['$$normA', 0] },
                    then: { $divide: ['$$dotProduct', { $multiply: ['$$normA', '$$normB'] }] },
                    else: 0
                  }
                }
              }
            }
          }
        },
        {
          $match: {
            semanticSimilarity: { $gte: threshold }
          }
        },
        {
          $sort: { semanticSimilarity: -1 }
        },
        {
          $limit: limit
        }
      ];

      const similarProperties = await this.propertyRepository.aggregate(pipeline);

      return {
        targetProperty: this._formatSearchResult(targetProperty),
        similarProperties: similarProperties.map(property => 
          this._formatSearchResult(property)
        ),
        searchMeta: {
          method: 'semantic',
          threshold,
          totalFound: similarProperties.length
        }
      };

    } catch (error) {
      throw this._handleSearchError(error, 'Similar properties search failed');
    }
  }

  /**
   * Check if query appears to be natural language vs structured search
   * @param {string} query - Search query
   * @returns {boolean} True if appears to be natural language
   * @private
   */
  _isNaturalLanguageQuery(query) {
    if (!query || typeof query !== 'string') {
      return false;
    }

    const trimmed = query.trim();
    
    // Consider it natural language if:
    // - Contains multiple words (3+)
    // - Contains question words or conversational phrases
    // - Contains Thai/English sentences
    // - Doesn't look like structured search terms

    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 3) {
      return false; // Too short, likely keywords
    }

    // Check for natural language indicators
    const naturalLanguageIndicators = [
      // English
      /\b(find|search|looking for|want|need|show me|i want|i need)\b/i,
      /\b(near|close to|around|within|in the area)\b/i,
      /\b(under|below|above|more than|less than)\b/i,
      /\b(with|having|that has|includes)\b/i,
      // Thai
      /\b(หา|ค้นหา|ต้องการ|อยาก|ขอ|แสดง)\b/i,
      /\b(ใกล้|แถว|รอบ|ในพื้นที่|ย่าน)\b/i,
      /\b(ต่ำกว่า|สูงกว่า|ไม่เกิน|มากกว่า|น้อยกว่า)\b/i,
      /\b(ที่มี|มี|ประกอบด้วย|รวม)\b/i
    ];

    return naturalLanguageIndicators.some(pattern => pattern.test(trimmed));
  }

  /**
   * Fallback method for finding similar properties without AI
   * @param {Object} targetProperty - Target property
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Similar properties
   * @private
   */
  async _findSimilarPropertiesFallback(targetProperty, options = {}) {
    const { limit = 10 } = options;

    // Build similarity query based on property attributes
    const similarityFilters = {
      _id: { $ne: targetProperty._id },
      status: 'available',
      propertyType: targetProperty.propertyType
    };

    // Price range (±30%)
    const priceRange = targetProperty.price * 0.3;
    similarityFilters.price = {
      $gte: targetProperty.price - priceRange,
      $lte: targetProperty.price + priceRange
    };

    // Area range (±20%)
    const areaRange = targetProperty.area * 0.2;
    similarityFilters.area = {
      $gte: targetProperty.area - areaRange,
      $lte: targetProperty.area + areaRange
    };

    // Same number of bedrooms if available
    if (targetProperty.rooms && targetProperty.rooms.bedrooms) {
      similarityFilters['rooms.bedrooms'] = targetProperty.rooms.bedrooms;
    }

    const similarProperties = await this.propertyRepository.findAll(
      similarityFilters,
      { limit, sort: { createdAt: -1 } }
    );

    return {
      targetProperty: this._formatSearchResult(targetProperty),
      similarProperties: similarProperties.properties.map(property => 
        this._formatSearchResult(property)
      ),
      searchMeta: {
        method: 'attribute-based',
        totalFound: similarProperties.properties.length,
        fallbackUsed: true
      }
    };
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