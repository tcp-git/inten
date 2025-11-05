/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - propertyType
 *         - area
 *         - location
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           example: "Modern 3-Bedroom House Near BTS"
 *         description:
 *           type: string
 *           minLength: 20
 *           maxLength: 2000
 *           example: |
 *             "Beautiful modern house with 3 bedrooms, 2.5 bathrooms, located near BTS station"
 *         price:
 *           type: integer
 *           minimum: 0
 *           example: 3500000
 *         propertyType:
 *           type: string
 *           enum: [house, condo, townhouse, land]
 *           example: "house"
 *         area:
 *           type: number
 *           minimum: 1
 *           example: 150.5
 *         status:
 *           type: string
 *           enum: [available, sold, rented, pending]
 *           example: "available"
 *         rooms:
 *           type: object
 *           properties:
 *             bedrooms:
 *               type: number
 *               minimum: 0
 *               example: 3
 *             bathrooms:
 *               type: number
 *               minimum: 0
 *               example: 2.5
 *         location:
 *           type: object
 *           required:
 *             - type
 *             - coordinates
 *             - address
 *           properties:
 *             type:
 *               type: string
 *               enum: [Point]
 *               example: "Point"
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 *               example: [100.5018, 13.7563]
 *               description: "[longitude, latitude]"
 *             address:
 *               type: string
 *               example: "123 Sukhumvit Road, Watthana, Bangkok"
 *             district:
 *               type: string
 *               example: "Watthana"
 *             province:
 *               type: string
 *               example: "Bangkok"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["parking", "garden", "modern kitchen", "near BTS"]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *         contact:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "John Doe"
 *             phone:
 *               type: string
 *               example: "+66812345678"
 *             email:
 *               type: string
 *               format: email
 *               example: "john.doe@example.com"
 *         embedding:
 *           type: array
 *           items:
 *             type: number
 *           description: "AI-generated semantic embedding vector (internal use)"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     CreatePropertyRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - propertyType
 *         - area
 *         - location
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           example: "Modern 3-Bedroom House Near BTS"
 *         description:
 *           type: string
 *           minLength: 20
 *           maxLength: 2000
 *           example: "Beautiful modern house with 3 bedrooms, 2.5 bathrooms"
 *         price:
 *           type: integer
 *           minimum: 0
 *           example: 3500000
 *         propertyType:
 *           type: string
 *           enum: [house, condo, townhouse, land]
 *           example: "house"
 *         area:
 *           type: number
 *           minimum: 1
 *           example: 150.5
 *         status:
 *           type: string
 *           enum: [available, sold, rented, pending]
 *           default: "available"
 *           example: "available"
 *         rooms:
 *           type: object
 *           properties:
 *             bedrooms:
 *               type: number
 *               minimum: 0
 *               example: 3
 *             bathrooms:
 *               type: number
 *               minimum: 0
 *               example: 2.5
 *         location:
 *           type: object
 *           required:
 *             - type
 *             - coordinates
 *             - address
 *           properties:
 *             type:
 *               type: string
 *               enum: [Point]
 *               example: "Point"
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 *               example: [100.5018, 13.7563]
 *               description: "[longitude, latitude]"
 *             address:
 *               type: string
 *               example: "123 Sukhumvit Road, Watthana, Bangkok"
 *             district:
 *               type: string
 *               example: "Watthana"
 *             province:
 *               type: string
 *               example: "Bangkok"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["parking", "garden", "modern kitchen", "near BTS"]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           example: ["https://example.com/image1.jpg"]
 *         contact:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "John Doe"
 *             phone:
 *               type: string
 *               example: "+66812345678"
 *             email:
 *               type: string
 *               format: email
 *               example: "john.doe@example.com"
 * 
 *     UpdatePropertyRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *         description:
 *           type: string
 *           minLength: 20
 *           maxLength: 2000
 *         price:
 *           type: integer
 *           minimum: 0
 *         propertyType:
 *           type: string
 *           enum: [house, condo, townhouse, land]
 *         area:
 *           type: number
 *           minimum: 1
 *         status:
 *           type: string
 *           enum: [available, sold, rented, pending]
 *         rooms:
 *           type: object
 *           properties:
 *             bedrooms:
 *               type: number
 *               minimum: 0
 *             bathrooms:
 *               type: number
 *               minimum: 0
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [Point]
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 *               description: "[longitude, latitude]"
 *             address:
 *               type: string
 *             district:
 *               type: string
 *             province:
 *               type: string
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *         contact:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 * 
 *     SearchRequest:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           example: "บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน"
 *           description: "Natural language search query in Thai or English"
 *         location:
 *           type: object
 *           properties:
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 *               example: [100.5018, 13.7563]
 *               description: "[longitude, latitude]"
 *             radius:
 *               type: number
 *               minimum: 0.1
 *               maximum: 50
 *               example: 5
 *               description: "Search radius in kilometers"
 *         filters:
 *           type: object
 *           properties:
 *             propertyType:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [house, condo, townhouse, land]
 *               example: ["house", "townhouse"]
 *             status:
 *               type: string
 *               enum: [available, sold, rented, pending]
 *               example: "available"
 *             minPrice:
 *               type: integer
 *               minimum: 0
 *               example: 1000000
 *             maxPrice:
 *               type: integer
 *               minimum: 0
 *               example: 5000000
 *             minArea:
 *               type: number
 *               minimum: 0
 *               example: 50
 *             maxArea:
 *               type: number
 *               minimum: 0
 *               example: 200
 *             bedrooms:
 *               type: integer
 *               minimum: 0
 *               example: 3
 *             bathrooms:
 *               type: number
 *               minimum: 0
 *               example: 2
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               minimum: 1
 *               default: 1
 *               example: 1
 *             limit:
 *               type: integer
 *               minimum: 1
 *               maximum: 100
 *               default: 20
 *               example: 20
 *         sortBy:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, area_asc, area_desc, newest, oldest, distance]
 *           default: "relevance"
 *           example: "relevance"
 *         useSemanticSearch:
 *           type: boolean
 *           default: true
 *           example: true
 *           description: "Enable AI-powered semantic search"
 * 
 *     SearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             properties:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Property'
 *                   - type: object
 *                     properties:
 *                       relevanceScore:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                         example: 0.89
 *                         description: "Overall relevance score"
 *                       semanticScore:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                         example: 0.85
 *                         description: "AI semantic similarity score"
 *                       locationScore:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                         example: 0.93
 *                         description: "Location proximity score"
 *                       distance:
 *                         type: number
 *                         example: 2.5
 *                         description: |
 *                           "Distance from search center in kilometers"
 *             pagination:
 *               $ref: '#/components/schemas/PaginationResponse'
 *             searchMeta:
 *               type: object
 *               properties:
 *                 aiProcessingTime:
 *                   type: number
 *                   example: 1.2
 *                   description: "AI processing time in seconds"
 *                 dbQueryTime:
 *                   type: number
 *                   example: 0.8
 *                   description: "Database query time in seconds"
 *                 extractedIntent:
 *                   type: string
 *                   example: "Find affordable house near educational facilities"
 *                 fallbackUsed:
 *                   type: boolean
 *                   example: false
 *                   description: |
 *                     "Whether fallback search was used due to AI service unavailability"
 * 
 *     PaginationResponse:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *           example: 1
 *         totalPages:
 *           type: integer
 *           example: 5
 *         totalResults:
 *           type: integer
 *           example: 87
 *         hasNext:
 *           type: boolean
 *           example: true
 *         hasPrevious:
 *           type: boolean
 *           example: false
 *         limit:
 *           type: integer
 *           example: 20
 * 
 *     PropertyStats:
 *       type: object
 *       properties:
 *         totalProperties:
 *           type: integer
 *           example: 1250
 *         byType:
 *           type: object
 *           properties:
 *             house:
 *               type: integer
 *               example: 450
 *             condo:
 *               type: integer
 *               example: 600
 *             townhouse:
 *               type: integer
 *               example: 150
 *             land:
 *               type: integer
 *               example: 50
 *         byStatus:
 *           type: object
 *           properties:
 *             available:
 *               type: integer
 *               example: 1000
 *             sold:
 *               type: integer
 *               example: 150
 *             rented:
 *               type: integer
 *               example: 80
 *             pending:
 *               type: integer
 *               example: 20
 *         priceRange:
 *           type: object
 *           properties:
 *             min:
 *               type: integer
 *               example: 500000
 *             max:
 *               type: integer
 *               example: 50000000
 *             average:
 *               type: integer
 *               example: 3500000
 * 
 *     GenerateEmbeddingsRequest:
 *       type: object
 *       properties:
 *         batchSize:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *           example: 10
 *           description: "Number of properties to process in each batch"
 *         continueOnError:
 *           type: boolean
 *           default: true
 *           example: true
 *           description: "Continue processing if individual properties fail"
 * 
 *     GenerateEmbeddingsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             processed:
 *               type: integer
 *               example: 25
 *               description: "Number of properties processed"
 *             updated:
 *               type: integer
 *               example: 23
 *               description: "Number of properties successfully updated with embeddings"
 *             errors:
 *               type: integer
 *               example: 2
 *               description: "Number of properties that failed processing"
 *             processingTime:
 *               type: number
 *               example: 45.2
 *               description: "Total processing time in seconds"
 *             errorDetails:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   propertyId:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439011"
 *                   error:
 *                     type: string
 *                     example: "AI service timeout"
 * 
 *     SimilarityResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             similarity:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               example: 0.87
 *               description: "Semantic similarity score between the two properties"
 *             property1:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 title:
 *                   type: string
 *                   example: "Modern House Near BTS"
 *             property2:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439012"
 *                 title:
 *                   type: string
 *                   example: "Contemporary Home with Garden"
 *             processingTime:
 *               type: number
 *               example: 0.15
 *               description: "Calculation time in seconds"
 * 
 *     SimilarPropertiesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             targetProperty:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 title:
 *                   type: string
 *                   example: "Modern House Near BTS"
 *             similarProperties:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Property'
 *                   - type: object
 *                     properties:
 *                       similarityScore:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                         example: 0.89
 *                         description: "Similarity score to target property"
 *             searchMeta:
 *               type: object
 *               properties:
 *                 threshold:
 *                   type: number
 *                   example: 0.7
 *                 totalCandidates:
 *                   type: integer
 *                   example: 150
 *                 processingTime:
 *                   type: number
 *                   example: 2.3
 * 
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - error
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *           description: "Always false for error responses"
 *         error:
 *           type: object
 *           required:
 *             - code
 *             - message
 *           properties:
 *             code:
 *               type: string
 *               enum: 
 *                 - VALIDATION_ERROR
 *                 - PROPERTY_NOT_FOUND
 *                 - DATABASE_ERROR
 *                 - AI_SERVICE_UNAVAILABLE
 *                 - RATE_LIMIT_EXCEEDED
 *                 - INTERNAL_SERVER_ERROR
 *                 - INVALID_PROPERTY_ID
 *                 - EMBEDDING_GENERATION_FAILED
 *                 - SEARCH_TIMEOUT
 *                 - INSUFFICIENT_DATA
 *               example: "VALIDATION_ERROR"
 *               description: "Specific error code for programmatic handling"
 *             message:
 *               type: string
 *               example: "Invalid input data"
 *               description: "Human-readable error message"
 *             details:
 *               type: object
 *               description: "Additional error details (optional)"
 *               additionalProperties: true
 *             timestamp:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00.000Z"
 *               description: "ISO 8601 timestamp when error occurred"
 *             requestId:
 *               type: string
 *               example: "req_123456789"
 *               description: "Unique request identifier for debugging"
 *             path:
 *               type: string
 *               example: "/api/properties/search"
 *               description: "API endpoint where error occurred"
 *             method:
 *               type: string
 *               example: "POST"
 *               description: "HTTP method used"
 * 
 *     ValidationErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - error
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *           description: "Always false for validation errors"
 *         error:
 *           type: object
 *           required:
 *             - code
 *             - message
 *             - details
 *           properties:
 *             code:
 *               type: string
 *               enum: [VALIDATION_ERROR]
 *               example: "VALIDATION_ERROR"
 *               description: "Error code indicating validation failure"
 *             message:
 *               type: string
 *               example: "Invalid input data"
 *               description: "General validation error message"
 *             details:
 *               type: array
 *               description: "Array of specific field validation errors"
 *               items:
 *                 type: object
 *                 required:
 *                   - field
 *                   - message
 *                 properties:
 *                   field:
 *                     type: string
 *                     example: "price"
 *                     description: "Name of the field that failed validation"
 *                   message:
 *                     type: string
 *                     example: "Price must be a positive number"
 *                     description: "Specific validation error message"
 *                   value:
 *                     description: "The invalid value that was provided"
 *                     example: -1000
 *                   constraint:
 *                     type: string
 *                     example: "min:0"
 *                     description: "The validation constraint that was violated"
 *             timestamp:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00.000Z"
 *               description: "ISO 8601 timestamp when validation failed"
 *             requestId:
 *               type: string
 *               example: "req_123456789"
 *               description: "Unique request identifier for debugging"
 * 
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 */