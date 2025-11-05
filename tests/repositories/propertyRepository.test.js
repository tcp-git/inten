const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const PropertyRepository = require('../../repositories/propertyRepository');
const Property = require('../../models/Property');

describe('PropertyRepository', () => {
  let mongoServer;
  let propertyRepository;

  // Sample property data for testing
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
    propertyRepository = new PropertyRepository();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await Property.deleteMany({});
  });

  describe('create', () => {
    it('should create a new property successfully', async () => {
      const property = await propertyRepository.create(samplePropertyData);

      expect(property).toBeDefined();
      expect(property._id).toBeDefined();
      expect(property.title).toBe(samplePropertyData.title);
      expect(property.price).toBe(samplePropertyData.price);
      expect(property.propertyType).toBe(samplePropertyData.propertyType);
      expect(property.location.coordinates).toEqual(samplePropertyData.location.coordinates);
    });

    it('should throw validation error for missing required fields', async () => {
      const invalidData = { title: 'Test Property' }; // Missing required fields

      await expect(propertyRepository.create(invalidData))
        .rejects
        .toThrow('Failed to create property');
    });

    it('should throw validation error for invalid coordinates', async () => {
      const invalidData = {
        ...samplePropertyData,
        location: {
          ...samplePropertyData.location,
          coordinates: [200, 100] // Invalid longitude
        }
      };

      await expect(propertyRepository.create(invalidData))
        .rejects
        .toThrow('Failed to create property');
    });
  });

  describe('findById', () => {
    it('should find property by valid ID', async () => {
      const createdProperty = await propertyRepository.create(samplePropertyData);
      const foundProperty = await propertyRepository.findById(createdProperty._id);

      expect(foundProperty).toBeDefined();
      expect(foundProperty._id.toString()).toBe(createdProperty._id.toString());
      expect(foundProperty.title).toBe(samplePropertyData.title);
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const property = await propertyRepository.findById(nonExistentId);

      expect(property).toBeNull();
    });

    it('should throw error for invalid ID format', async () => {
      await expect(propertyRepository.findById('invalid-id'))
        .rejects
        .toThrow('Invalid ID format');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create multiple test properties
      const properties = [
        { ...samplePropertyData, title: 'Property 1', price: 2000000 },
        { ...samplePropertyData, title: 'Property 2', price: 3000000, propertyType: 'house' },
        { ...samplePropertyData, title: 'Property 3', price: 4000000, status: 'sold' }
      ];

      for (const propertyData of properties) {
        await propertyRepository.create(propertyData);
      }
    });

    it('should return all properties with default options', async () => {
      const result = await propertyRepository.findAll();

      expect(result.properties).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should filter properties by status', async () => {
      const result = await propertyRepository.findAll({ status: 'available' });

      expect(result.properties).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter properties by property type', async () => {
      const result = await propertyRepository.findAll({ propertyType: 'house' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].propertyType).toBe('house');
    });

    it('should apply pagination correctly', async () => {
      const result = await propertyRepository.findAll({}, { limit: 2, skip: 1 });

      expect(result.properties).toHaveLength(2);
      expect(result.limit).toBe(2);
      expect(result.skip).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should sort properties correctly', async () => {
      const result = await propertyRepository.findAll({}, { sort: { price: 1 } });

      expect(result.properties[0].price).toBe(2000000);
      expect(result.properties[1].price).toBe(3000000);
      expect(result.properties[2].price).toBe(4000000);
    });
  });

  describe('updateById', () => {
    let propertyId;

    beforeEach(async () => {
      const property = await propertyRepository.create(samplePropertyData);
      propertyId = property._id;
    });

    it('should update property successfully', async () => {
      const updateData = {
        title: 'Updated Property Title',
        price: 4000000
      };

      const updatedProperty = await propertyRepository.updateById(propertyId, updateData);

      expect(updatedProperty).toBeDefined();
      expect(updatedProperty.title).toBe(updateData.title);
      expect(updatedProperty.price).toBe(updateData.price);
      expect(updatedProperty.updatedAt).toBeDefined();
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { title: 'Updated Title' };

      const result = await propertyRepository.updateById(nonExistentId, updateData);

      expect(result).toBeNull();
    });

    it('should validate updated data', async () => {
      const invalidUpdateData = { price: -1000 }; // Invalid negative price

      await expect(propertyRepository.updateById(propertyId, invalidUpdateData))
        .rejects
        .toThrow('Failed to update property');
    });
  });

  describe('deleteById', () => {
    let propertyId;

    beforeEach(async () => {
      const property = await propertyRepository.create(samplePropertyData);
      propertyId = property._id;
    });

    it('should delete property successfully', async () => {
      const deletedProperty = await propertyRepository.deleteById(propertyId);

      expect(deletedProperty).toBeDefined();
      expect(deletedProperty._id.toString()).toBe(propertyId.toString());

      // Verify property is actually deleted
      const foundProperty = await propertyRepository.findById(propertyId);
      expect(foundProperty).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await propertyRepository.deleteById(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('existsById', () => {
    let propertyId;

    beforeEach(async () => {
      const property = await propertyRepository.create(samplePropertyData);
      propertyId = property._id;
    });

    it('should return true for existing property', async () => {
      const exists = await propertyRepository.existsById(propertyId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent property', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const exists = await propertyRepository.existsById(nonExistentId);
      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      const properties = [
        { ...samplePropertyData, title: 'Property 1' },
        { ...samplePropertyData, title: 'Property 2', status: 'sold' },
        { ...samplePropertyData, title: 'Property 3' }
      ];

      for (const propertyData of properties) {
        await propertyRepository.create(propertyData);
      }
    });

    it('should count all properties', async () => {
      const count = await propertyRepository.count();
      expect(count).toBe(3);
    });

    it('should count properties with filters', async () => {
      const count = await propertyRepository.count({ status: 'available' });
      expect(count).toBe(2);
    });
  });
});