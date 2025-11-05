const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const Property = require('../../models/Property');

describe('Property API Endpoints', () => {
  let mongoServer;

  const samplePropertyData = {
    title: 'Modern Condo in Bangkok',
    description: 'Beautiful 2-bedroom condo with city view and modern amenities',
    price: 3500000,
    propertyType: 'condo',
    area: 85,
    rooms: {
      bedrooms: 2,
      bathrooms: 2
    },
    location: {
      type: 'Point',
      coordinates: [100.5412, 13.7563],
      address: '123 Sukhumvit Road, Bangkok',
      district: 'Watthana',
      province: 'Bangkok'
    },
    features: ['Swimming Pool', 'Gym', 'Security'],
    status: 'available'
  };

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await Property.deleteMany({});
  });

  describe('POST /api/properties', () => {
    it('should create a new property with valid data', async () => {
      const response = await request(app)
        .post('/api/properties')
        .send(samplePropertyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Property created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(samplePropertyData.title);
      expect(response.body.data._id).toBeDefined();
    });

    it('should return validation error for missing required fields', async () => {
      const invalidData = { title: 'Test Property' }; // Missing required fields

      const response = await request(app)
        .post('/api/properties')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return validation error for invalid property type', async () => {
      const invalidData = {
        ...samplePropertyData,
        propertyType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/properties')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid coordinates', async () => {
      const invalidData = {
        ...samplePropertyData,
        location: {
          ...samplePropertyData.location,
          coordinates: [200, 100] // Invalid longitude
        }
      };

      const response = await request(app)
        .post('/api/properties')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/properties/:id', () => {
    let propertyId;

    beforeEach(async () => {
      const property = new Property(samplePropertyData);
      const savedProperty = await property.save();
      propertyId = savedProperty._id.toString();
    });

    it('should get property by valid ID', async () => {
      const response = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(propertyId);
      expect(response.body.data.title).toBe(samplePropertyData.title);
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/properties/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/properties', () => {
    beforeEach(async () => {
      // Create multiple test properties
      const properties = [
        { ...samplePropertyData, title: 'Property 1', price: 2000000 },
        { ...samplePropertyData, title: 'Property 2', price: 3000000, propertyType: 'house' },
        { ...samplePropertyData, title: 'Property 3', price: 4000000, status: 'sold' }
      ];

      for (const propertyData of properties) {
        const property = new Property(propertyData);
        await property.save();
      }
    });

    it('should get all available properties with default pagination', async () => {
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Only available properties
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalItems).toBe(2);
    });

    it('should filter properties by property type', async () => {
      const response = await request(app)
        .get('/api/properties?propertyType=house')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].propertyType).toBe('house');
    });

    it('should filter properties by price range', async () => {
      const response = await request(app)
        .get('/api/properties?minPrice=2500000&maxPrice=3500000')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].price).toBe(3000000);
    });

    it('should apply pagination correctly', async () => {
      const response = await request(app)
        .get('/api/properties?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.hasNextPage).toBe(true);
    });

    it('should return validation error for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/properties?page=0') // Invalid page number
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/properties/:id', () => {
    let propertyId;

    beforeEach(async () => {
      const property = new Property(samplePropertyData);
      const savedProperty = await property.save();
      propertyId = savedProperty._id.toString();
    });

    it('should update property with valid data', async () => {
      const updateData = {
        title: 'Updated Property Title',
        price: 4000000
      };

      const response = await request(app)
        .put(`/api/properties/${propertyId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Property updated successfully');
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/properties/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });

    it('should return validation error for invalid update data', async () => {
      const invalidUpdateData = { price: -1000 }; // Invalid negative price

      const response = await request(app)
        .put(`/api/properties/${propertyId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    let propertyId;

    beforeEach(async () => {
      const property = new Property(samplePropertyData);
      const savedProperty = await property.save();
      propertyId = savedProperty._id.toString();
    });

    it('should delete property successfully', async () => {
      const response = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Property deleted successfully');
      expect(response.body.data).toBeDefined();

      // Verify property is actually deleted
      const deletedProperty = await Property.findById(propertyId);
      expect(deletedProperty).toBeNull();
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/properties/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });
  });

  describe('GET /api/properties/stats', () => {
    beforeEach(async () => {
      // Create properties with different statuses
      const properties = [
        { ...samplePropertyData, title: 'Available 1', status: 'available' },
        { ...samplePropertyData, title: 'Available 2', status: 'available' },
        { ...samplePropertyData, title: 'Sold 1', status: 'sold' },
        { ...samplePropertyData, title: 'Rented 1', status: 'rented' }
      ];

      for (const propertyData of properties) {
        const property = new Property(propertyData);
        await property.save();
      }
    });

    it('should return property statistics', async () => {
      const response = await request(app)
        .get('/api/properties/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        total: 4,
        available: 2,
        sold: 1,
        rented: 1,
        pending: 0,
        embeddings: expect.objectContaining({
          totalProperties: expect.any(Number),
          propertiesWithEmbeddings: expect.any(Number),
          propertiesWithoutEmbeddings: expect.any(Number),
          coveragePercentage: expect.any(Number),
          lastUpdated: expect.any(String)
        })
      });
    });
  });
});