const express = require('express');
const PropertyController = require('../controllers/propertyController');
const {
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertyId,
  validateGetPropertiesQuery,
  validateSearchProperties,
} = require('../middleware/validation');

const router = express.Router();
const propertyController = new PropertyController();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management and search operations
 */

/**
 * Property Routes
 * Base path: /api/properties
 */

/**
 * @swagger
 * /api/properties/stats:
 *   get:
 *     summary: Get property statistics
 *     description: |
 *       Retrieve comprehensive statistics about properties in the database 
 *       including counts by type, status, and price ranges.
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Property statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PropertyStats'
 *             example:
 *               success: true
 *               data:
 *                 totalProperties: 1250
 *                 byType:
 *                   house: 450
 *                   condo: 600
 *                   townhouse: 150
 *                   land: 50
 *                 byStatus:
 *                   available: 1000
 *                   sold: 150
 *                   rented: 80
 *                   pending: 20
 *                 priceRange:
 *                   min: 500000
 *                   max: 50000000
 *                   average: 3500000
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', async (req, res) => {
  await propertyController.getPropertyStats(req, res);
});

/**
 * @swagger
 * /api/properties/search:
 *   post:
 *     summary: Search properties with AI-powered natural language processing
 *     description: |
 *       Advanced property search supporting:
 *       - Natural language queries in Thai and English
 *       - AI-powered intent detection and semantic search
 *       - Geospatial location-based filtering
 *       - Traditional filter-based search
 *       - Flexible sorting and pagination
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: useSemanticSearch
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Enable AI-powered semantic search (overrides body parameter)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *           examples:
 *             naturalLanguageSearch:
 *               summary: Natural language search
 *               value:
 *                 query: "บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน"
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                 sortBy: "relevance"
 *             locationBasedSearch:
 *               summary: Location-based search with filters
 *               value:
 *                 query: "modern house with parking"
 *                 location:
 *                   coordinates: [100.5018, 13.7563]
 *                   radius: 5
 *                 filters:
 *                   propertyType: ["house", "townhouse"]
 *                   minPrice: 2000000
 *                   maxPrice: 5000000
 *                   bedrooms: 3
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                 sortBy: "price_asc"
 *             filterOnlySearch:
 *               summary: Filter-based search without text query
 *               value:
 *                 filters:
 *                   status: "available"
 *                   propertyType: "condo"
 *                   minArea: 50
 *                   maxArea: 100
 *                 sortBy: "newest"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: Invalid search parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       503:
 *         description: AI service unavailable (falls back to keyword search)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/search', validateSearchProperties, async (req, res) => {
  await propertyController.searchProperties(req, res);
});

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties with filtering and pagination
 *     description: |
 *       Retrieve a paginated list of properties with optional filtering by various 
 *       criteria such as price range, property type, location, and room count.
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of properties per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, price, area, title]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, sold, rented, pending]
 *           default: available
 *         description: Filter by property status
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [house, condo, townhouse, land]
 *         description: Filter by property type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Minimum price filter (Thai Baht)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Maximum price filter (Thai Baht)
 *       - in: query
 *         name: minArea
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum area filter (square meters)
 *       - in: query
 *         name: maxArea
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum area filter (square meters)
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Filter by number of bedrooms
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Filter by number of bathrooms
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', validateGetPropertiesQuery, async (req, res) => {
  await propertyController.getAllProperties(req, res);
});

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property
 *     description: |
 *       Create a new property listing with all required information. 
 *       The system will automatically generate semantic embeddings for AI-powered search.
 *       
 *       **Note:** In production, this endpoint should be protected with authentication.
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePropertyRequest'
 *           example:
 *             title: "Modern 3-Bedroom House Near BTS"
 *             description: |
 *               "Beautiful modern house with 3 bedrooms, 2.5 bathrooms, located near BTS station. 
 *               Features include parking, garden, and modern kitchen with built-in appliances."
 *             price: 3500000
 *             propertyType: "house"
 *             area: 150.5
 *             rooms:
 *               bedrooms: 3
 *               bathrooms: 2.5
 *             location:
 *               type: "Point"
 *               coordinates: [100.5018, 13.7563]
 *               address: "123 Sukhumvit Road, Watthana, Bangkok"
 *               district: "Watthana"
 *               province: "Bangkok"
 *             features: ["parking", "garden", "modern kitchen", "near BTS"]
 *             status: "available"
 *             images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *             contact:
 *               name: "John Doe"
 *               phone: "+66812345678"
 *               email: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid property data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validateCreateProperty, async (req, res) => {
  await propertyController.createProperty(req, res);
});

/**
 * @swagger
 * /api/properties/generate-embeddings:
 *   post:
 *     summary: Generate semantic embeddings for properties
 *     description: |
 *       Generate AI embeddings for properties that don't have them yet. 
 *       This is used for semantic search functionality. The process runs in batches 
 *       to avoid overwhelming the AI service.
 *       
 *       **Note:** In production, this endpoint should be protected with authentication.
 *     tags: [Properties]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateEmbeddingsRequest'
 *           example:
 *             batchSize: 10
 *             continueOnError: true
 *     responses:
 *       200:
 *         description: Embedding generation completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerateEmbeddingsResponse'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       503:
 *         description: AI service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/generate-embeddings', async (req, res) => {
  await propertyController.generateEmbeddings(req, res);
});

/**
 * @swagger
 * /api/properties/{id1}/similarity/{id2}:
 *   get:
 *     summary: Calculate semantic similarity between two properties
 *     description: |
 *       Calculate the semantic similarity score between two properties using AI embeddings.
 *       Returns a similarity score between 0 and 1, where 1 indicates identical properties.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id1
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: First property ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *       - in: path
 *         name: id2
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Second property ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Similarity calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimilarityResponse'
 *       400:
 *         description: Invalid property IDs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: One or both properties not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id1/similarity/:id2', async (req, res) => {
  await propertyController.calculateSimilarity(req, res);
});

/**
 * @swagger
 * /api/properties/{id}/similar:
 *   get:
 *     summary: Find properties similar to a given property
 *     description: |
 *       Find properties that are similar to the specified property using 
 *       AI-powered semantic search.
 *       Results are ranked by similarity score and can be filtered by threshold.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Target property ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Maximum number of similar properties to return
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.7
 *         description: Minimum similarity threshold (0-1)
 *       - in: query
 *         name: useSemanticSearch
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Use AI-powered semantic search
 *       - in: query
 *         name: includeScores
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include similarity scores in response
 *     responses:
 *       200:
 *         description: Similar properties found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimilarPropertiesResponse'
 *       400:
 *         description: Invalid property ID or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Target property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/similar', validatePropertyId, async (req, res) => {
  await propertyController.getSimilarProperties(req, res);
});

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     description: |
 *       Retrieve detailed information about a specific property by its unique identifier.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Property ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid property ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', validatePropertyId, async (req, res) => {
  await propertyController.getProperty(req, res);
});

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update property by ID
 *     description: |
 *       Update an existing property with new information. At least one field must be provided.
 *       The system will automatically regenerate semantic embeddings if 
 *       description or title changes.
 *       
 *       **Note:** In production, this endpoint should be protected with authentication.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Property ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePropertyRequest'
 *           example:
 *             title: "Updated Modern House Near BTS"
 *             price: 3800000
 *             status: "available"
 *             features: ["parking", "garden", "modern kitchen", "near BTS", "swimming pool"]
 *     responses:
 *       200:
 *         description: Property updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid property ID or update data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', validatePropertyId, validateUpdateProperty, async (req, res) => {
  await propertyController.updateProperty(req, res);
});

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete property by ID
 *     description: |
 *       Permanently delete a property from the database. This action cannot be undone.
 *       
 *       **Note:** In production, this endpoint should be protected with authentication.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Property ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Property'
 *                       description: "The deleted property data"
 *       400:
 *         description: Invalid property ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', validatePropertyId, async (req, res) => {
  await propertyController.deleteProperty(req, res);
});

module.exports = router;