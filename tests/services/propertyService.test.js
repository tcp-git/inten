const PropertyService = require('../../services/propertyService');
const PropertyRepository = require('../../repositories/propertyRepository');

// Mock the PropertyRepository
jest.mock('../../repositories/propertyRepository');

describe('PropertyService', () => {
  let propertyService;
  let mockPropertyRepository;

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

  const mockProperty = {
    _id: '507f1f77bcf86cd799439011',
    ...samplePropertyData,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: () => ({ ...mockProperty }),
    formattedPrice: '฿3,500,000',
    pricePerSqm: 41176
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh instances
    propertyService = new PropertyService();
    mockPropertyRepository = PropertyRepository.prototype;
  });

  describe('createProperty', () => {
    it('should create property successfully with valid data', async () => {
      mockPropertyRepository.create.mockResolvedValue(mockProperty);

      const result = await propertyService.createProperty(samplePropertyData);

      expect(mockPropertyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: samplePropertyData.title.trim(),
          description: samplePropertyData.description.trim()
        })
      );
      expect(result).toEqual(expect.objectContaining({
        _id: mockProperty._id,
        title: mockProperty.title
      }));
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = { title: 'Test Property' }; // Missing required fields

      await expect(propertyService.createProperty(invalidData))
        .rejects
        .toThrow('Missing required fields');
    });

    it('should throw error for invalid location', async () => {
      const invalidData = {
        ...samplePropertyData,
        location: { address: 'Test Address' } // Missing coordinates
      };

      await expect(propertyService.createProperty(invalidData))
        .rejects
        .toThrow('Location must include coordinates and address');
    });

    it('should normalize property data before creation', async () => {
      const dataWithSpaces = {
        ...samplePropertyData,
        title: '  Spaced Title  ',
        description: '  Spaced Description  ',
        features: ['  Feature 1  ', '  Feature 2  ', '  Feature 1  '] // Duplicates and spaces
      };

      mockPropertyRepository.create.mockResolvedValue(mockProperty);

      await propertyService.createProperty(dataWithSpaces);

      expect(mockPropertyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Spaced Title',
          description: 'Spaced Description',
          features: ['Feature 1', 'Feature 2'] // Trimmed and deduplicated
        })
      );
    });
  });

  describe('getPropertyById', () => {
    it('should return property for valid ID', async () => {
      mockPropertyRepository.findById.mockResolvedValue(mockProperty);

      const result = await propertyService.getPropertyById('507f1f77bcf86cd799439011');

      expect(mockPropertyRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(expect.objectContaining({
        _id: mockProperty._id,
        formattedPrice: mockProperty.formattedPrice
      }));
    });

    it('should throw error for non-existent property', async () => {
      mockPropertyRepository.findById.mockResolvedValue(null);

      await expect(propertyService.getPropertyById('507f1f77bcf86cd799439011'))
        .rejects
        .toThrow('Property not found');
    });

    it('should throw error for missing ID', async () => {
      await expect(propertyService.getPropertyById(''))
        .rejects
        .toThrow('Property ID is required');
    });
  });

  describe('getAllProperties', () => {
    const mockResult = {
      properties: [mockProperty],
      total: 1,
      limit: 20,
      skip: 0,
      hasMore: false
    };

    it('should return properties with default options', async () => {
      mockPropertyRepository.findAll.mockResolvedValue(mockResult);

      const result = await propertyService.getAllProperties();

      expect(mockPropertyRepository.findAll).toHaveBeenCalledWith(
        { status: 'available' },
        expect.objectContaining({
          limit: 20,
          skip: 0,
          sort: { createdAt: -1 }
        })
      );
      expect(result.properties).toHaveLength(1);
      expect(result.pagination).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const options = {
        propertyType: 'condo',
        minPrice: 2000000,
        maxPrice: 5000000,
        bedrooms: 2
      };

      mockPropertyRepository.findAll.mockResolvedValue(mockResult);

      await propertyService.getAllProperties(options);

      expect(mockPropertyRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'available',
          propertyType: 'condo',
          price: { $gte: 2000000, $lte: 5000000 },
          'rooms.bedrooms': 2
        }),
        expect.any(Object)
      );
    });

    it('should handle pagination correctly', async () => {
      const options = { page: 2, limit: 10 };
      mockPropertyRepository.findAll.mockResolvedValue({
        ...mockResult,
        total: 25,
        hasMore: true
      });

      const result = await propertyService.getAllProperties(options);

      expect(mockPropertyRepository.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          limit: 10,
          skip: 10 // (page - 1) * limit
        })
      );
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully', async () => {
      const updateData = { title: 'Updated Title', price: 4000000 };
      const updatedProperty = { 
        ...mockProperty, 
        ...updateData,
        toObject: () => ({ ...mockProperty, ...updateData }),
        formattedPrice: '฿4,000,000',
        pricePerSqm: 47059
      };

      mockPropertyRepository.existsById.mockResolvedValue(true);
      mockPropertyRepository.updateById.mockResolvedValue(updatedProperty);

      const result = await propertyService.updateProperty('507f1f77bcf86cd799439011', updateData);

      expect(mockPropertyRepository.existsById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPropertyRepository.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining(updateData)
      );
      expect(result.title).toBe(updateData.title);
    });

    it('should throw error for non-existent property', async () => {
      mockPropertyRepository.existsById.mockResolvedValue(false);

      await expect(propertyService.updateProperty('507f1f77bcf86cd799439011', { title: 'New Title' }))
        .rejects
        .toThrow('Property not found');
    });

    it('should filter out disallowed fields', async () => {
      const updateData = {
        title: 'Updated Title',
        _id: 'should-not-update',
        createdAt: new Date(),
        allowedField: 'should-be-filtered'
      };

      mockPropertyRepository.existsById.mockResolvedValue(true);
      mockPropertyRepository.updateById.mockResolvedValue(mockProperty);

      await propertyService.updateProperty('507f1f77bcf86cd799439011', updateData);

      expect(mockPropertyRepository.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
          title: 'Updated Title'
        })
      );
      
      const calledWith = mockPropertyRepository.updateById.mock.calls[0][1];
      expect(calledWith).not.toHaveProperty('_id');
      expect(calledWith).not.toHaveProperty('createdAt');
      expect(calledWith).not.toHaveProperty('allowedField');
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      mockPropertyRepository.deleteById.mockResolvedValue(mockProperty);

      const result = await propertyService.deleteProperty('507f1f77bcf86cd799439011');

      expect(mockPropertyRepository.deleteById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Property deleted successfully');
      expect(result.deletedProperty).toBeDefined();
    });

    it('should throw error for non-existent property', async () => {
      mockPropertyRepository.deleteById.mockResolvedValue(null);

      await expect(propertyService.deleteProperty('507f1f77bcf86cd799439011'))
        .rejects
        .toThrow('Property not found');
    });

    it('should throw error for missing ID', async () => {
      await expect(propertyService.deleteProperty(''))
        .rejects
        .toThrow('Property ID is required');
    });
  });

  describe('getPropertyStats', () => {
    it('should return property statistics', async () => {
      mockPropertyRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75)  // available
        .mockResolvedValueOnce(15)  // sold
        .mockResolvedValueOnce(5);  // rented

      const result = await propertyService.getPropertyStats();

      expect(result).toEqual({
        total: 100,
        available: 75,
        sold: 15,
        rented: 5,
        pending: 5 // total - available - sold - rented
      });
    });
  });
});