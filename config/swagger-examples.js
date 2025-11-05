/**
 * @swagger
 * components:
 *   examples:
 *     # Search Examples
 *     BasicThaiSearch:
 *       summary: Basic Thai Language Search
 *       description: Simple natural language search in Thai
 *       value:
 *         query: "บ้านใกล้โรงเรียน"
 *         pagination:
 *           page: 1
 *           limit: 10
 * 
 *     AdvancedThaiSearch:
 *       summary: Advanced Thai Search with Filters
 *       description: Complex search combining natural language with specific filters
 *       value:
 *         query: "บ้านสวย มีสวน งบไม่เกิน 3 ล้าน"
 *         filters:
 *           propertyType: ["house", "townhouse"]
 *           maxPrice: 3000000
 *           bedrooms: 3
 *         location:
 *           coordinates: [100.5018, 13.7563]
 *           radius: 10
 *         pagination:
 *           page: 1
 *           limit: 20
 *         sortBy: "relevance"
 * 
 *     EnglishSemanticSearch:
 *       summary: English Semantic Search
 *       description: Natural language search in English with semantic understanding
 *       value:
 *         query: "spacious family home with garden near good schools"
 *         useSemanticSearch: true
 *         pagination:
 *           page: 1
 *           limit: 15
 *         sortBy: "relevance"
 * 
 *     LocationOnlySearch:
 *       summary: Location-Based Search
 *       description: Search properties within specific geographic area
 *       value:
 *         location:
 *           coordinates: [100.5412, 13.7563]
 *           radius: 2
 *         filters:
 *           status: "available"
 *           minArea: 80
 *         sortBy: "distance"
 * 
 *     FilterOnlySearch:
 *       summary: Filter-Based Search
 *       description: Search using only filters without text query
 *       value:
 *         filters:
 *           propertyType: "condo"
 *           minPrice: 2000000
 *           maxPrice: 5000000
 *           bedrooms: 2
 *           bathrooms: 2
 *         sortBy: "price_asc"
 *         pagination:
 *           page: 1
 *           limit: 25
 * 
 *     # Property Creation Examples
 *     BasicHouseProperty:
 *       summary: Basic House Property
 *       description: Minimal required fields for creating a house property
 *       value:
 *         title: "Cozy 2-Bedroom House"
 *         description: "A comfortable 2-bedroom house in a quiet neighborhood with easy access to public transportation and local amenities."
 *         price: 2500000
 *         propertyType: "house"
 *         area: 120
 *         location:
 *           type: "Point"
 *           coordinates: [100.5018, 13.7563]
 *           address: "456 Peaceful Street, Sukhumvit, Bangkok"
 * 
 *     LuxuryCondoProperty:
 *       summary: Luxury Condo Property
 *       description: Complete property listing with all optional fields
 *       value:
 *         title: "Luxury High-Rise Condo with City View"
 *         description: "Stunning 35th-floor luxury condominium featuring panoramic city views, premium finishes, and world-class amenities including infinity pool, fitness center, and 24/7 concierge service."
 *         price: 8500000
 *         propertyType: "condo"
 *         area: 85.5
 *         status: "available"
 *         rooms:
 *           bedrooms: 2
 *           bathrooms: 2.5
 *         location:
 *           type: "Point"
 *           coordinates: [100.5412, 13.7563]
 *           address: "789 Luxury Tower, Silom Road, Bangkok"
 *           district: "Silom"
 *           province: "Bangkok"
 *         features:
 *           - "city view"
 *           - "infinity pool"
 *           - "fitness center"
 *           - "concierge service"
 *           - "parking"
 *           - "security"
 *         images:
 *           - "https://example.com/condo1.jpg"
 *           - "https://example.com/condo2.jpg"
 *           - "https://example.com/condo3.jpg"
 *         contact:
 *           name: "Sarah Johnson"
 *           phone: "+66812345678"
 *           email: "sarah.johnson@example.com"
 * 
 *     TownhouseProperty:
 *       summary: Townhouse Property
 *       description: Family-friendly townhouse with garden
 *       value:
 *         title: "Modern 3-Story Townhouse with Garden"
 *         description: "Spacious 3-story townhouse perfect for families, featuring a private garden, modern kitchen, and convenient location near schools and shopping centers."
 *         price: 4200000
 *         propertyType: "townhouse"
 *         area: 180
 *         rooms:
 *           bedrooms: 4
 *           bathrooms: 3
 *         location:
 *           type: "Point"
 *           coordinates: [100.4956, 13.7650]
 *           address: "321 Family Lane, Thonglor, Bangkok"
 *           district: "Thonglor"
 *           province: "Bangkok"
 *         features:
 *           - "garden"
 *           - "parking for 2 cars"
 *           - "modern kitchen"
 *           - "near schools"
 *           - "shopping nearby"
 * 
 *     # Update Examples
 *     PriceUpdate:
 *       summary: Price Update
 *       description: Update only the property price
 *       value:
 *         price: 2800000
 * 
 *     StatusUpdate:
 *       summary: Status Update
 *       description: Change property status to sold
 *       value:
 *         status: "sold"
 * 
 *     ComprehensiveUpdate:
 *       summary: Comprehensive Update
 *       description: Update multiple fields including adding new features
 *       value:
 *         title: "Updated Modern House with Pool"
 *         price: 3200000
 *         features:
 *           - "swimming pool"
 *           - "garden"
 *           - "parking"
 *           - "security system"
 *         contact:
 *           name: "Updated Contact Person"
 *           phone: "+66887654321"
 *           email: "updated.contact@example.com"
 * 
 *     # Error Examples
 *     ValidationErrorExample:
 *       summary: Validation Error Response
 *       description: Example of validation error with multiple field errors
 *       value:
 *         success: false
 *         error:
 *           code: "VALIDATION_ERROR"
 *           message: "Invalid input data"
 *           details:
 *             - field: "price"
 *               message: "Price must be a positive number"
 *               value: -1000
 *               constraint: "min:0"
 *             - field: "location.coordinates"
 *               message: "Coordinates must be an array of exactly 2 numbers"
 *               value: [100.5018]
 *               constraint: "arrayLength:2"
 *             - field: "propertyType"
 *               message: "Property type must be one of: house, condo, townhouse, land"
 *               value: "apartment"
 *               constraint: "enum"
 *           timestamp: "2024-01-15T10:30:00.000Z"
 *           requestId: "req_123456789"
 * 
 *     PropertyNotFoundExample:
 *       summary: Property Not Found Error
 *       description: Error when requesting a non-existent property
 *       value:
 *         success: false
 *         error:
 *           code: "PROPERTY_NOT_FOUND"
 *           message: "Property with ID '507f1f77bcf86cd799439011' was not found"
 *           timestamp: "2024-01-15T10:30:00.000Z"
 *           requestId: "req_123456789"
 *           path: "/api/properties/507f1f77bcf86cd799439011"
 *           method: "GET"
 * 
 *     AIServiceUnavailableExample:
 *       summary: AI Service Unavailable
 *       description: Error when AI service is down but search continues with fallback
 *       value:
 *         success: true
 *         data:
 *           properties: []
 *           pagination:
 *             currentPage: 1
 *             totalPages: 0
 *             totalResults: 0
 *             hasNext: false
 *             hasPrevious: false
 *           searchMeta:
 *             aiProcessingTime: null
 *             dbQueryTime: 0.5
 *             extractedIntent: null
 *             fallbackUsed: true
 *             fallbackReason: "AI service unavailable - using keyword search"
 * 
 *     RateLimitExample:
 *       summary: Rate Limit Exceeded
 *       description: Error when API rate limit is exceeded
 *       value:
 *         success: false
 *         error:
 *           code: "RATE_LIMIT_EXCEEDED"
 *           message: "Too many requests. Please try again in 15 minutes."
 *           details:
 *             limit: 100
 *             windowMs: 900000
 *             retryAfter: 847
 *           timestamp: "2024-01-15T10:30:00.000Z"
 *           requestId: "req_123456789"
 * 
 *     # Success Response Examples
 *     SearchSuccessExample:
 *       summary: Successful Search Response
 *       description: Example of successful search with AI processing
 *       value:
 *         success: true
 *         data:
 *           properties:
 *             - _id: "507f1f77bcf86cd799439011"
 *               title: "Modern House Near School"
 *               description: "Beautiful 3-bedroom house located near excellent schools"
 *               price: 2800000
 *               propertyType: "house"
 *               area: 150
 *               location:
 *                 coordinates: [100.5018, 13.7563]
 *                 address: "123 Education Street, Bangkok"
 *                 distance: 1.2
 *               relevanceScore: 0.92
 *               semanticScore: 0.89
 *               locationScore: 0.95
 *           pagination:
 *             currentPage: 1
 *             totalPages: 3
 *             totalResults: 47
 *             hasNext: true
 *             hasPrevious: false
 *             limit: 20
 *           searchMeta:
 *             aiProcessingTime: 1.8
 *             dbQueryTime: 0.3
 *             extractedIntent: "Find family house near educational facilities"
 *             fallbackUsed: false
 * 
 *     PropertyCreatedExample:
 *       summary: Property Created Successfully
 *       description: Response after successfully creating a new property
 *       value:
 *         success: true
 *         data:
 *           _id: "507f1f77bcf86cd799439011"
 *           title: "Modern 3-Bedroom House Near BTS"
 *           description: "Beautiful modern house with 3 bedrooms, 2.5 bathrooms"
 *           price: 3500000
 *           propertyType: "house"
 *           area: 150.5
 *           status: "available"
 *           location:
 *             type: "Point"
 *             coordinates: [100.5018, 13.7563]
 *             address: "123 Sukhumvit Road, Watthana, Bangkok"
 *           createdAt: "2024-01-15T10:30:00.000Z"
 *           updatedAt: "2024-01-15T10:30:00.000Z"
 *         message: "Property created successfully"
 *         timestamp: "2024-01-15T10:30:00.000Z"
 */