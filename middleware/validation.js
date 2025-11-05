const Joi = require('joi');
const { ValidationError } = require('./errors');

/**
 * Joi validation schemas for Property API endpoints
 */

// Base schemas for reusable components
const coordinatesSchema = Joi.array()
  .length(2)
  .items(Joi.number())
  .custom((value, helpers) => {
    if (value.length !== 2) {
      return helpers.error('coordinates.length');
    }
    
    const [lng, lat] = value;
    
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return helpers.error('coordinates.type');
    }
    
    if (lng < -180 || lng > 180) {
      return helpers.error('coordinates.longitude');
    }
    
    if (lat < -90 || lat > 90) {
      return helpers.error('coordinates.latitude');
    }
    
    return value;
  })
  .required()
  .messages({
    'coordinates.length': 'Coordinates must contain exactly 2 numbers [longitude, latitude]',
    'coordinates.type': 'Coordinates must be numbers',
    'coordinates.longitude': 'Longitude must be between -180 and 180',
    'coordinates.latitude': 'Latitude must be between -90 and 90',
  });

const locationSchema = Joi.object({
  type: Joi.string().valid('Point').required(),
  coordinates: coordinatesSchema,
  address: Joi.string().min(10).max(500).trim().required(),
  district: Joi.string().max(100).trim().optional(),
  province: Joi.string().max(100).trim().optional(),
}).required();

const roomsSchema = Joi.object({
  bedrooms: Joi.number().integer().min(0).default(0),
  bathrooms: Joi.number().min(0).default(0),
}).optional();

const contactSchema = Joi.object({
  name: Joi.string().max(100).trim().optional(),
  phone: Joi.string().pattern(/^(\+66|0)[0-9]{8,9}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid Thai phone number',
  }),
  email: Joi.string().email().lowercase().optional(),
}).optional();

// Property creation schema
const createPropertySchema = Joi.object({
  title: Joi.string().min(5).max(200).trim().required(),
  description: Joi.string().min(20).max(2000).trim().required(),
  price: Joi.number().integer().min(0).required(),
  propertyType: Joi.string().valid('house', 'condo', 'townhouse', 'land').required(),
  area: Joi.number().min(1).required(),
  rooms: roomsSchema,
  location: locationSchema,
  features: Joi.array().items(Joi.string().max(100).trim()).default([]),
  status: Joi.string().valid('available', 'sold', 'rented', 'pending').default('available'),
  images: Joi.array().items(Joi.string().uri()).default([]),
  contact: contactSchema,
});

// Property update schema (all fields optional except validation rules)
const updatePropertySchema = Joi.object({
  title: Joi.string().min(5).max(200).trim().optional(),
  description: Joi.string().min(20).max(2000).trim().optional(),
  price: Joi.number().integer().min(0).optional(),
  propertyType: Joi.string().valid('house', 'condo', 'townhouse', 'land').optional(),
  area: Joi.number().min(1).optional(),
  rooms: roomsSchema,
  location: locationSchema.optional(),
  features: Joi.array().items(Joi.string().max(100).trim()).optional(),
  status: Joi.string().valid('available', 'sold', 'rented', 'pending').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  contact: contactSchema,
}).min(1); // At least one field must be provided for update

// Query parameters schema for GET /properties
const getPropertiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'price', 'area', 'title').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  status: Joi.string().valid('available', 'sold', 'rented', 'pending').default('available'),
  propertyType: Joi.string().valid('house', 'condo', 'townhouse', 'land').optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  minArea: Joi.number().min(0).optional(),
  maxArea: Joi.number().min(0).optional(),
  bedrooms: Joi.number().integer().min(0).optional(),
  bathrooms: Joi.number().min(0).optional(),
}).custom((value, helpers) => {
  // Custom validation: maxPrice should be greater than minPrice
  if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
    return helpers.error('custom.priceRange');
  }
  
  // Custom validation: maxArea should be greater than minArea
  if (value.minArea && value.maxArea && value.minArea > value.maxArea) {
    return helpers.error('custom.areaRange');
  }
  
  return value;
}).messages({
  'custom.priceRange': 'Maximum price must be greater than minimum price',
  'custom.areaRange': 'Maximum area must be greater than minimum area',
});

// MongoDB ObjectId validation schema
const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
  'string.pattern.base': 'Invalid property ID format',
});

// Search request schema
const searchPropertiesSchema = Joi.object({
  query: Joi.string().trim().max(200).optional(),
  location: Joi.object({
    coordinates: coordinatesSchema.optional(),
    radius: Joi.number().min(1).max(100).default(10).optional(),
  }).optional(),
  filters: Joi.object({
    status: Joi.string().valid('available', 'sold', 'rented', 'pending').optional(),
    propertyType: Joi.alternatives().try(
      Joi.string().valid('house', 'condo', 'townhouse', 'land'),
      Joi.array().items(Joi.string().valid('house', 'condo', 'townhouse', 'land')),
    ).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    minArea: Joi.number().min(0).optional(),
    maxArea: Joi.number().min(0).optional(),
    bedrooms: Joi.number().integer().min(0).optional(),
    bathrooms: Joi.number().min(0).optional(),
    features: Joi.array().items(Joi.string().max(100).trim()).optional(),
  }).optional(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }).optional(),
  sortBy: Joi.string().valid(
    'relevance', 'price_asc', 'price_desc', 'area_asc', 'area_desc', 
    'distance', 'newest', 'oldest',
  ).default('relevance'),
}).custom((value, helpers) => {
  // Custom validation: maxPrice should be greater than minPrice
  if (value.filters?.minPrice && value.filters?.maxPrice && value.filters.minPrice > value.filters.maxPrice) {
    return helpers.error('custom.priceRange');
  }
  
  // Custom validation: maxArea should be greater than minArea
  if (value.filters?.minArea && value.filters?.maxArea && value.filters.minArea > value.filters.maxArea) {
    return helpers.error('custom.areaRange');
  }

  // Custom validation: location coordinates required if location is provided
  if (value.location && !value.location.coordinates) {
    return helpers.error('custom.locationCoordinates');
  }
  
  return value;
}).messages({
  'custom.priceRange': 'Maximum price must be greater than minimum price',
  'custom.areaRange': 'Maximum area must be greater than minimum area',
  'custom.locationCoordinates': 'Location coordinates are required when location filter is provided',
});

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types (e.g., string numbers to numbers)
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      const validationError = new ValidationError('Invalid input data', validationErrors);
      return next(validationError);
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validation middleware for property creation
 */
const validateCreateProperty = validate(createPropertySchema, 'body');

/**
 * Validation middleware for property updates
 */
const validateUpdateProperty = validate(updatePropertySchema, 'body');

/**
 * Validation middleware for property ID in URL params
 */
const validatePropertyId = validate(Joi.object({ id: objectIdSchema }), 'params');

/**
 * Validation middleware for query parameters
 */
const validateGetPropertiesQuery = validate(getPropertiesQuerySchema, 'query');

/**
 * Validation middleware for search properties request
 */
const validateSearchProperties = validate(searchPropertiesSchema, 'body');

module.exports = {
  validate,
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertyId,
  validateGetPropertiesQuery,
  validateSearchProperties,
  // Export schemas for testing
  schemas: {
    createPropertySchema,
    updatePropertySchema,
    getPropertiesQuerySchema,
    searchPropertiesSchema,
    objectIdSchema,
  }
};