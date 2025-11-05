const PropertyRepository = require('../repositories/propertyRepository');
const AISearchService = require('./aiSearchService');
const EmbeddingService = require('./embeddingService');
const winston = require('winston');

/**
 * Semantic Search Service - Enhanced search with semantic similarity
 * Provides advanced ranking combining semantic, location, and price scores
 */
class SemanticSearchService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
    this.aiSearchService = new AISearchService();
    this.embeddingService = new EmbeddingService();
    
    // Configure logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'semantic-search-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Perform semantic search with enhanced ranking
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results with semantic scores
   */
  async searchWithSemanticRanking(searchParams = {}) {
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

      let queryEmbedding = null;

      // Process query with AI if enabled
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
              queryEmbedding = aiParams.embedding;
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

      // Build enhanced aggregation pipeline
      const pipeline = this._buildSemanticSearchPipeline(
        searchText,
        location,
        filters,
        queryEmbedding
      );

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

      // Format results with enhanced scoring
      const formattedResults = searchResults.map(property => 
        this._formatSemanticSearchResult(property, searchText, location, queryEmbedding)
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
          hasSemanticSearch: !!queryEmbedding,
          appliedFilters: this._getAppliedFilters(filters),
          sortBy,
          aiProcessing: aiMeta,
          semanticSearchEnabled: !!queryEmbedding
        }
      };

    } catch (error) {
      this.logger.error('Semantic search failed', {
        error: error.message,
        searchParams
      });
      throw this._handleSearchError(error, 'Semantic search failed');
    }
  }

  /**
   * Find semantically similar properties
   * @param {string} propertyId - Property ID to find similar properties for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Similar properties with semantic scores
   */
  async findSimilarPropertiesWithSemantics(propertyId, options = {}) {
    try {
      const { limit = 10, threshold = 0.7, includeScores = true } = options;

      // Get the target property
      const targetProperty = await this.propertyRepository.findById(propertyId);
      if (!targetProperty) {
        throw new Error('Property not found');
      }

      // Ensure target property has embedding
      let targetEmbedding = targetProperty.embedding;
      if (!targetEmbedding || targetEmbedding.length === 0) {
        this.logger.info('Generating embedding for target property', { propertyId });
        targetEmbedding = await this.embeddingService.generatePropertyEmbedding(propertyId);
      }

      if (!targetEmbedding || targetEmbedding.length === 0) {
        // Fallback to attribute-based similarity
        return this._findSimilarPropertiesFallback(targetProperty, options);
      }

      // Build semantic similarity pipeline
      const pipeline = [
        {
          $match: {
            _id: { $ne: targetProperty._id },
            status: 'available',
            embedding: { $exists: true, $ne: [], $ne: null }
          }
        },
        {
          $addFields: {
            semanticSimilarity: this._buildSemanticSimilarityScore(targetEmbedding),
            locationSimilarity: this._buildLocationSimilarityScore(targetProperty.location),
            attributeSimilarity: this._buildAttributeSimilarityScore(targetProperty)
          }
        },
        {
          $addFields: {
            overallSimilarity: {
              $add: [
                { $multiply: ['$semanticSimilarity', 0.5] },
                { $multiply: ['$locationSimilarity', 0.3] },
                { $multiply: ['$attributeSimilarity', 0.2] }
              ]
            }
          }
        },
        {
          $match: {
            overallSimilarity: { $gte: threshold }
          }
        },
        {
          $sort: { overallSimilarity: -1 }
        },
        {
          $limit: limit
        }
      ];

      const similarProperties = await this.propertyRepository.aggregate(pipeline);

      return {
        targetProperty: this._formatSemanticSearchResult(targetProperty),
        similarProperties: similarProperties.map(property => {
          const formatted = this._formatSemanticSearchResult(property);
          if (includeScores) {
            formatted.similarityScores = {
              overall: Math.round(property.overallSimilarity * 100) / 100,
              semantic: Math.round(property.semanticSimilarity * 100) / 100,
              location: Math.round(property.locationSimilarity * 100) / 100,
              attributes: Math.round(property.attributeSimilarity * 100) / 100
            };
          }
          return formatted;
        }),
        searchMeta: {
          method: 'semantic',
          threshold,
          totalFound: similarProperties.length,
          targetEmbeddingDimensions: targetEmbedding.length
        }
      };

    } catch (error) {
      this.logger.error('Semantic similarity search failed', {
        propertyId,
        error: error.message
      });
      throw this._handleSearchError(error, 'Semantic similarity search failed');
    }
  }

  /**
   * Build semantic search aggregation pipeline
   * @param {string} searchText - Search query text
   * @param {Object} location - Location parameters
   * @param {Object} filters - Search filters
   * @param {Array} queryEmbedding - Query embedding vector
   * @returns {Array} MongoDB aggregation pipeline
   * @private
   */
  _buildSemanticSearchPipeline(searchText, location, filters, queryEmbedding) {
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
      const geoFilter = this._buildGeoWithinFilter(location);
      if (pipeline[0] && pipeline[0].$match) {
        pipeline[0].$match = { ...pipeline[0].$match, ...geoFilter };
      } else {
        pipeline.unshift({ $match: geoFilter });
      }
      
      // Add distance calculation
      pipeline.push({
        $addFields: {
          distance: this._buildDistanceCalculation(location.coordinates)
        }
      });
    }

    // Stage 4: Calculate semantic similarity if embedding available
    if (queryEmbedding && queryEmbedding.length > 0) {
      pipeline.push({
        $addFields: {
          semanticSimilarity: this._buildSemanticSimilarityScore(queryEmbedding)
        }
      });
    }

    // Stage 5: Calculate enhanced relevance score
    pipeline.push({
      $addFields: {
        relevanceScore: this._buildEnhancedRelevanceScore(searchText, location, queryEmbedding)
      }
    });

    // Stage 6: Sort results
    const sortStage = this._buildSortStage('relevance', searchText, location);
    pipeline.push({ $sort: sortStage });

    return pipeline;
  }

  /**
   * Build enhanced relevance score with semantic search integration
   * @param {string} searchText - Search query text
   * @param {Object} location - Location parameters
   * @param {Array} queryEmbedding - Query embedding for semantic similarity
   * @returns {Object} MongoDB expression for relevance score
   * @private
   */
  _buildEnhancedRelevanceScore(searchText, location, queryEmbedding) {
    const scoreComponents = [];
    
    // Determine if we have semantic search capability
    const hasSemanticSearch = queryEmbedding && queryEmbedding.length > 0;
    
    // Text relevance score (0-1) - reduced weight when semantic search is available
    if (searchText) {
      const textWeight = hasSemanticSearch ? 0.15 : 0.35;
      scoreComponents.push({
        $multiply: [
          { $ifNull: ['$textScore', 0] },
          textWeight
        ]
      });
    }

    // Semantic similarity score (0-1) - primary ranking factor when available
    if (hasSemanticSearch) {
      scoreComponents.push({
        $multiply: [
          { $ifNull: ['$semanticSimilarity', 0] },
          0.45 // 45% weight for semantic similarity - highest priority
        ]
      });
    }

    // Location proximity score (0-1) - higher weight when no semantic search
    if (location && location.coordinates) {
      const locationWeight = hasSemanticSearch ? 0.25 : 0.35;
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
          locationWeight
        ]
      });
    }

    // Price competitiveness score (0-1) - balanced scoring
    const priceWeight = hasSemanticSearch ? 0.15 : 0.20;
    scoreComponents.push({
      $multiply: [
        {
          // Logarithmic price scoring for better distribution
          $subtract: [
            1,
            {
              $min: [
                {
                  $divide: [
                    { $ln: { $add: ['$price', 1] } },
                    { $ln: 10000001 } // ln(10M + 1)
                  ]
                },
                1
              ]
            }
          ]
        },
        priceWeight
      ]
    });

    return scoreComponents.length > 1 ? { $add: scoreComponents } : scoreComponents[0];
  }

  /**
   * Build semantic similarity score calculation
   * @param {Array} targetEmbedding - Target embedding vector
   * @returns {Object} MongoDB expression for semantic similarity
   * @private
   */
  _buildSemanticSimilarityScore(targetEmbedding) {
    return {
      $cond: {
        if: { $and: [{ $isArray: '$embedding' }, { $gt: [{ $size: '$embedding' }, 0] }] },
        then: {
          // Calculate cosine similarity using MongoDB aggregation
          $let: {
            vars: {
              dotProduct: {
                $sum: {
                  $map: {
                    input: { $range: [0, { $min: [{ $size: '$embedding' }, targetEmbedding.length] }] },
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
                if: { $and: [{ $gt: ['$$normA', 0] }, { $gt: ['$$normB', 0] }] },
                then: { 
                  $max: [
                    0,
                    { $min: [
                      1,
                      { $divide: ['$$dotProduct', { $multiply: ['$$normA', '$$normB'] }] }
                    ]}
                  ]
                },
                else: 0
              }
            }
          }
        },
        else: 0
      }
    };
  }

  /**
   * Build location similarity score for similar properties
   * @param {Object} targetLocation - Target property location
   * @returns {Object} MongoDB expression for location similarity
   * @private
   */
  _buildLocationSimilarityScore(targetLocation) {
    if (!targetLocation || !targetLocation.coordinates) {
      return 0;
    }

    const [targetLng, targetLat] = targetLocation.coordinates;
    
    return {
      $let: {
        vars: {
          distance: {
            $sqrt: {
              $add: [
                {
                  $pow: [
                    {
                      $multiply: [
                        { $subtract: [{ $arrayElemAt: ['$location.coordinates', 0] }, targetLng] },
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
                        { $subtract: [{ $arrayElemAt: ['$location.coordinates', 1] }, targetLat] },
                        110540 // meters per degree latitude
                      ]
                    },
                    2
                  ]
                }
              ]
            }
          }
        },
        in: {
          $subtract: [
            1,
            {
              $min: [
                { $divide: ['$$distance', 10000] }, // Normalize to 10km max
                1
              ]
            }
          ]
        }
      }
    };
  }

  /**
   * Build attribute similarity score for similar properties
   * @param {Object} targetProperty - Target property
   * @returns {Object} MongoDB expression for attribute similarity
   * @private
   */
  _buildAttributeSimilarityScore(targetProperty) {
    const scoreComponents = [];

    // Property type match (0 or 1)
    scoreComponents.push({
      $cond: {
        if: { $eq: ['$propertyType', targetProperty.propertyType] },
        then: 1,
        else: 0
      }
    });

    // Price similarity (0-1)
    const priceRange = targetProperty.price * 0.3; // ±30%
    scoreComponents.push({
      $cond: {
        if: {
          $and: [
            { $gte: ['$price', targetProperty.price - priceRange] },
            { $lte: ['$price', targetProperty.price + priceRange] }
          ]
        },
        then: {
          $subtract: [
            1,
            {
              $divide: [
                { $abs: { $subtract: ['$price', targetProperty.price] } },
                priceRange
              ]
            }
          ]
        },
        else: 0
      }
    });

    // Area similarity (0-1)
    const areaRange = targetProperty.area * 0.2; // ±20%
    scoreComponents.push({
      $cond: {
        if: {
          $and: [
            { $gte: ['$area', targetProperty.area - areaRange] },
            { $lte: ['$area', targetProperty.area + areaRange] }
          ]
        },
        then: {
          $subtract: [
            1,
            {
              $divide: [
                { $abs: { $subtract: ['$area', targetProperty.area] } },
                areaRange
              ]
            }
          ]
        },
        else: 0
      }
    });

    return {
      $divide: [
        { $add: scoreComponents },
        scoreComponents.length
      ]
    };
  }

  // Helper methods (reuse from SearchService with modifications)
  _buildMatchStage(filters) {
    const match = {};
    match.status = filters && filters.status !== undefined ? filters.status : 'available';
    
    if (filters.propertyType) {
      if (Array.isArray(filters.propertyType)) {
        match.propertyType = { $in: filters.propertyType };
      } else {
        match.propertyType = filters.propertyType;
      }
    }
    
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      match.price = {};
      if (filters.minPrice !== undefined) match.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) match.price.$lte = filters.maxPrice;
    }
    
    if (filters.minArea !== undefined || filters.maxArea !== undefined) {
      match.area = {};
      if (filters.minArea !== undefined) match.area.$gte = filters.minArea;
      if (filters.maxArea !== undefined) match.area.$lte = filters.maxArea;
    }
    
    if (filters.bedrooms !== undefined) {
      match['rooms.bedrooms'] = filters.bedrooms;
    }
    
    if (filters.bathrooms !== undefined) {
      match['rooms.bathrooms'] = { $gte: filters.bathrooms };
    }
    
    if (filters.features && Array.isArray(filters.features) && filters.features.length > 0) {
      match.features = { $in: filters.features };
    }
    
    return match;
  }

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

  _buildDistanceCalculation(coordinates) {
    const [lng, lat] = coordinates;
    
    return {
      $divide: [
        {
          $sqrt: {
            $add: [
              {
                $pow: [
                  {
                    $multiply: [
                      { $subtract: [{ $arrayElemAt: ['$location.coordinates', 0] }, lng] },
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
                      { $subtract: [{ $arrayElemAt: ['$location.coordinates', 1] }, lat] },
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
    };
  }

  _buildSortStage(sortBy, searchText, location) {
    switch (sortBy) {
    case 'relevance':
      return { relevanceScore: -1, createdAt: -1 };
    case 'semantic':
      return { semanticSimilarity: -1, relevanceScore: -1 };
    case 'price_asc':
      return { price: 1, createdAt: -1 };
    case 'price_desc':
      return { price: -1, createdAt: -1 };
    case 'distance':
      return location ? { distance: 1, createdAt: -1 } : { createdAt: -1 };
    default:
      return { relevanceScore: -1, createdAt: -1 };
    }
  }

  async _getSearchCount(pipeline) {
    const countPipeline = [
      ...pipeline,
      { $count: 'total' }
    ];

    const result = await this.propertyRepository.aggregate(countPipeline);
    return result.length > 0 ? result[0].total : 0;
  }

  _formatSemanticSearchResult(property, searchText, location, queryEmbedding) {
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
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    };

    // Add search-specific scores
    if (property.relevanceScore !== undefined) {
      formatted.relevanceScore = Math.round(property.relevanceScore * 100) / 100;
    }

    if (property.semanticSimilarity !== undefined) {
      formatted.semanticSimilarity = Math.round(property.semanticSimilarity * 100) / 100;
    }

    if (property.textScore !== undefined) {
      formatted.textScore = Math.round(property.textScore * 100) / 100;
    }

    if (property.distance !== undefined) {
      formatted.distance = Math.round(property.distance * 100) / 100;
    }

    return formatted;
  }

  _getAppliedFilters(filters) {
    const applied = {};
    
    if (filters.propertyType) applied.propertyType = filters.propertyType;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      applied.priceRange = { min: filters.minPrice, max: filters.maxPrice };
    }
    if (filters.minArea !== undefined || filters.maxArea !== undefined) {
      applied.areaRange = { min: filters.minArea, max: filters.maxArea };
    }
    if (filters.bedrooms !== undefined) applied.bedrooms = filters.bedrooms;
    if (filters.bathrooms !== undefined) applied.bathrooms = filters.bathrooms;
    if (filters.features) applied.features = filters.features;
    if (filters.status) applied.status = filters.status;
    
    return applied;
  }

  _isNaturalLanguageQuery(query) {
    if (!query || typeof query !== 'string') {
      return false;
    }

    const trimmed = query.trim();
    const wordCount = trimmed.split(/\s+/).length;
    
    if (wordCount < 3) {
      return false;
    }

    const naturalLanguageIndicators = [
      /\b(find|search|looking for|want|need|show me|i want|i need)\b/i,
      /\b(near|close to|around|within|in the area)\b/i,
      /\b(under|below|above|more than|less than)\b/i,
      /\b(with|having|that has|includes)\b/i,
      /\b(หา|ค้นหา|ต้องการ|อยาก|ขอ|แสดง)\b/i,
      /\b(ใกล้|แถว|รอบ|ในพื้นที่|ย่าน)\b/i,
      /\b(ต่ำกว่า|สูงกว่า|ไม่เกิน|มากกว่า|น้อยกว่า)\b/i,
      /\b(ที่มี|มี|ประกอบด้วย|รวม)\b/i
    ];

    return naturalLanguageIndicators.some(pattern => pattern.test(trimmed));
  }

  async _findSimilarPropertiesFallback(targetProperty, options = {}) {
    const { limit = 10 } = options;

    const similarityFilters = {
      _id: { $ne: targetProperty._id },
      status: 'available',
      propertyType: targetProperty.propertyType
    };

    const priceRange = targetProperty.price * 0.3;
    similarityFilters.price = {
      $gte: targetProperty.price - priceRange,
      $lte: targetProperty.price + priceRange
    };

    const areaRange = targetProperty.area * 0.2;
    similarityFilters.area = {
      $gte: targetProperty.area - areaRange,
      $lte: targetProperty.area + areaRange
    };

    if (targetProperty.rooms && targetProperty.rooms.bedrooms) {
      similarityFilters['rooms.bedrooms'] = targetProperty.rooms.bedrooms;
    }

    const similarProperties = await this.propertyRepository.findAll(
      similarityFilters,
      { limit, sort: { createdAt: -1 } }
    );

    return {
      targetProperty: this._formatSemanticSearchResult(targetProperty),
      similarProperties: similarProperties.properties.map(property => 
        this._formatSemanticSearchResult(property)
      ),
      searchMeta: {
        method: 'attribute-based',
        totalFound: similarProperties.properties.length,
        fallbackUsed: true
      }
    };
  }

  _handleSearchError(error, message) {
    if (error.name === 'ValidationError') {
      const formattedError = new Error(`${message}: Invalid search parameters`);
      formattedError.code = 'SEARCH_VALIDATION_ERROR';
      formattedError.details = error.message;
      return formattedError;
    }

    error.message = `${message}: ${error.message}`;
    return error;
  }
}

module.exports = SemanticSearchService;