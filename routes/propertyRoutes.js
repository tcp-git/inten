const express = require('express');
const PropertyController = require('../controllers/propertyController');
const {
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertyId,
  validateGetPropertiesQuery,
  validateSearchProperties
} = require('../middleware/validation');

const router = express.Router();
const propertyController = new PropertyController();

/**
 * Property Routes
 * Base path: /api/properties
 */

/**
 * @route   GET /api/properties/stats
 * @desc    Get property statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  await propertyController.getPropertyStats(req, res);
});

/**
 * @route   POST /api/properties/search
 * @desc    Search properties with text, location, and filters
 * @access  Public
 * @body    {Object} searchParams - Search parameters including query, location, filters, pagination, and sortBy
 */
router.post('/search', validateSearchProperties, async (req, res) => {
  await propertyController.searchProperties(req, res);
});

/**
 * @route   GET /api/properties
 * @desc    Get all properties with filtering and pagination
 * @access  Public
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 20, max: 100)
 * @query   {string} sortBy - Sort field (createdAt, price, area, title)
 * @query   {string} sortOrder - Sort order (asc, desc)
 * @query   {string} status - Property status filter
 * @query   {string} propertyType - Property type filter
 * @query   {number} minPrice - Minimum price filter
 * @query   {number} maxPrice - Maximum price filter
 * @query   {number} minArea - Minimum area filter
 * @query   {number} maxArea - Maximum area filter
 * @query   {number} bedrooms - Number of bedrooms filter
 * @query   {number} bathrooms - Number of bathrooms filter
 */
router.get('/', validateGetPropertiesQuery, async (req, res) => {
  await propertyController.getAllProperties(req, res);
});

/**
 * @route   POST /api/properties
 * @desc    Create a new property
 * @access  Public (should be protected in production)
 * @body    {Object} propertyData - Property information
 */
router.post('/', validateCreateProperty, async (req, res) => {
  await propertyController.createProperty(req, res);
});

/**
 * @route   GET /api/properties/:id
 * @desc    Get property by ID
 * @access  Public
 * @param   {string} id - Property ID (MongoDB ObjectId)
 */
router.get('/:id', validatePropertyId, async (req, res) => {
  await propertyController.getProperty(req, res);
});

/**
 * @route   PUT /api/properties/:id
 * @desc    Update property by ID
 * @access  Public (should be protected in production)
 * @param   {string} id - Property ID (MongoDB ObjectId)
 * @body    {Object} updateData - Fields to update
 */
router.put('/:id', validatePropertyId, validateUpdateProperty, async (req, res) => {
  await propertyController.updateProperty(req, res);
});

/**
 * @route   DELETE /api/properties/:id
 * @desc    Delete property by ID
 * @access  Public (should be protected in production)
 * @param   {string} id - Property ID (MongoDB ObjectId)
 */
router.delete('/:id', validatePropertyId, async (req, res) => {
  await propertyController.deleteProperty(req, res);
});

module.exports = router;