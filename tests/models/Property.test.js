const mongoose = require('mongoose');
const Property = require('../../models/Property');

describe('Property Model', () => {
  // Test without database connection - focus on schema validation

  describe('Schema Validation', () => {
    const validPropertyData = {
      title: 'Modern Condo Near BTS',
      description: 'Beautiful 2-bedroom condo with city view, fully furnished with modern amenities',
      price: 3500000,
      propertyType: 'condo',
      area: 85,
      rooms: {
        bedrooms: 2,
        bathrooms: 2,
      },
      location: {
        type: 'Point',
        coordinates: [100.5412, 13.7563], // [longitude, latitude] - Bangkok
        address: '123 Sukhumvit Road, Watthana, Bangkok 10110',
        district: 'Watthana',
        province: 'Bangkok',
      },
      features: ['Swimming Pool', 'Gym', 'Security', 'Parking'],
      contact: {
        name: 'John Doe',
        phone: '0812345678',
        email: 'john@example.com',
      }
    };

    test('should create a valid property instance', () => {
      const property = new Property(validPropertyData);

      expect(property.title).toBe(validPropertyData.title);
      expect(property.price).toBe(validPropertyData.price);
      expect(property.location.coordinates).toEqual(validPropertyData.location.coordinates);
      expect(property.status).toBe('available'); // default value
    });

    test('should validate required fields', () => {
      const property = new Property({});
      const validationError = property.validateSync();

      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.description).toBeDefined();
      expect(validationError.errors.price).toBeDefined();
      expect(validationError.errors.propertyType).toBeDefined();
      expect(validationError.errors.area).toBeDefined();
    });

    test('should validate price is positive', () => {
      const property = new Property({ ...validPropertyData, price: -1000 });
      const validationError = property.validateSync();

      expect(validationError.errors.price).toBeDefined();
      expect(validationError.errors.price.message).toContain('positive');
    });

    test('should validate propertyType enum', () => {
      const property = new Property({ ...validPropertyData, propertyType: 'invalid-type' });
      const validationError = property.validateSync();

      expect(validationError.errors.propertyType).toBeDefined();
      expect(validationError.errors.propertyType.message).toContain('house, condo, townhouse, land');
    });

    test('should validate location coordinates', () => {
      const propertyData = {
        ...validPropertyData,
        location: {
          ...validPropertyData.location,
          coordinates: [200, 100], // Invalid longitude
        }
      };

      const property = new Property(propertyData);
      const validationError = property.validateSync();

      expect(validationError.errors['location.coordinates']).toBeDefined();
    });

    test('should validate area is positive', () => {
      const property = new Property({ ...validPropertyData, area: 0 });
      const validationError = property.validateSync();

      expect(validationError.errors.area).toBeDefined();
      expect(validationError.errors.area.message).toContain('at least 1');
    });

    test('should validate phone number format', () => {
      const propertyData = {
        ...validPropertyData,
        contact: {
          ...validPropertyData.contact,
          phone: 'invalid-phone',
        }
      };

      const property = new Property(propertyData);
      const validationError = property.validateSync();

      expect(validationError.errors['contact.phone']).toBeDefined();
    });

    test('should validate email format', () => {
      const propertyData = {
        ...validPropertyData,
        contact: {
          ...validPropertyData.contact,
          email: 'invalid-email',
        }
      };

      const property = new Property(propertyData);
      const validationError = property.validateSync();

      expect(validationError.errors['contact.email']).toBeDefined();
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate formatted price', async () => {
      const property = new Property({
        title: 'Test Property',
        description: 'Test description for property validation',
        price: 3500000,
        propertyType: 'condo',
        area: 85,
        location: {
          type: 'Point',
          coordinates: [100.5412, 13.7563],
          address: '123 Test Street, Bangkok',
        }
      });

      expect(property.formattedPrice).toContain('3,500,000');
    });

    test('should calculate price per square meter', async () => {
      const property = new Property({
        title: 'Test Property',
        description: 'Test description for property validation',
        price: 3500000,
        propertyType: 'condo',
        area: 100,
        location: {
          type: 'Point',
          coordinates: [100.5412, 13.7563],
          address: '123 Test Street, Bangkok',
        }
      });

      expect(property.pricePerSqm).toBe(35000);
    });
  });

  describe('Instance Methods', () => {
    test('should calculate distance between properties', async () => {
      const property = new Property({
        title: 'Test Property',
        description: 'Test description for property validation',
        price: 3500000,
        propertyType: 'condo',
        area: 85,
        location: {
          type: 'Point',
          coordinates: [100.5412, 13.7563], // Bangkok coordinates
          address: '123 Test Street, Bangkok',
        }
      });

      // Calculate distance to a nearby point (approximately 1km away)
      const distance = property.calculateDistance(100.5512, 13.7663);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be less than 20km
    });
  });

  describe('Schema Structure', () => {
    test('should have correct schema paths', () => {
      const schema = Property.schema;
      
      // Check required fields exist
      expect(schema.paths.title).toBeDefined();
      expect(schema.paths.description).toBeDefined();
      expect(schema.paths.price).toBeDefined();
      expect(schema.paths.propertyType).toBeDefined();
      expect(schema.paths.area).toBeDefined();
      
      // Check nested fields (Mongoose creates these automatically)
      expect(schema.paths['rooms.bedrooms']).toBeDefined();
      expect(schema.paths['rooms.bathrooms']).toBeDefined();
      expect(schema.paths['location.type']).toBeDefined();
      expect(schema.paths['location.coordinates']).toBeDefined();
      expect(schema.paths['location.address']).toBeDefined();
      
      // Check that the schema has the expected structure
      expect(Object.keys(schema.paths)).toContain('title');
      expect(Object.keys(schema.paths)).toContain('price');
      expect(Object.keys(schema.paths)).toContain('propertyType');
    });

    test('should have correct indexes defined', () => {
      const schema = Property.schema;
      const indexes = schema.indexes();
      
      // Check that indexes are defined (structure validation)
      expect(indexes.length).toBeGreaterThan(0);
      
      // Check for geospatial index
      const geoIndex = indexes.find(index => 
        index[0] && index[0].location === '2dsphere',
      );
      expect(geoIndex).toBeDefined();
      
      // Check for text index
      const textIndex = indexes.find(index => 
        index[0] && (index[0].title === 'text' || index[0]['$**'] === 'text'),
      );
      expect(textIndex).toBeDefined();
    });
  });
});