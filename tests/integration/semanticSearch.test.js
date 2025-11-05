const request = require('supertest');
const app = require('../../server');

describe('Semantic Search API Integration Tests', () => {
  describe('Search API Endpoints', () => {
    it('should handle semantic search requests', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'modern condo',
          useSemanticSearch: true,
          pagination: { page: 1, limit: 10 },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('searchMeta');
    });

    it('should handle search with location parameters', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'condo',
          location: {
            coordinates: [100.5412, 13.7563],
            radius: 5,
          },
          useSemanticSearch: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.searchMeta).toHaveProperty('hasLocationSearch');
    });

    it('should handle search with filters', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'property',
          filters: {
            propertyType: 'condo',
            minPrice: 1000000,
            maxPrice: 5000000,
          },
          useSemanticSearch: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.searchMeta).toHaveProperty('appliedFilters');
    });

    it('should handle search without semantic search', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'condo',
          useSemanticSearch: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.searchMeta.hasSemanticSearch).toBe(false);
    });
  });

  describe('Similar Properties API Endpoints', () => {
    it('should validate property ID format for similar properties', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id/similar')
        .query({ limit: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle similar properties request with query parameters', async () => {
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ 
          limit: 10, 
          threshold: 0.8, 
          useSemanticSearch: 'true',
          includeScores: 'true',
        });

      // Should return either 404 (property not found) or 200 (found similar properties)
      expect([200, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should handle semantic search parameter for similar properties', async () => {
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ 
          useSemanticSearch: 'false',
          limit: 5,
        });

      // Should return either 404 (property not found) or 200 (found similar properties)
      expect([200, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should validate limit parameter for similar properties', async () => {
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ limit: 0 }); // Invalid limit

      // Should handle validation error or property not found
      expect([400, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should validate threshold parameter for similar properties', async () => {
      const response = await request(app)
        .get('/api/properties/507f1f77bcf86cd799439011/similar')
        .query({ threshold: 1.5 }); // Invalid threshold (should be 0-1)

      // Should handle validation error or property not found
      expect([400, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid search parameters', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'test',
          location: {
            coordinates: [200, 100], // Invalid coordinates
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'test',
          pagination: {
            page: -1, // Invalid page
            limit: 100,
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
    });

    it('should handle empty search gracefully', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format for search', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'condo',
          useSemanticSearch: true,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('searchMeta');
      
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalResults');
      
      expect(response.body.searchMeta).toHaveProperty('hasSemanticSearch');
      expect(response.body.searchMeta).toHaveProperty('aiProcessing');
    });

    it('should include semantic search metadata when enabled', async () => {
      const response = await request(app)
        .post('/api/properties/search')
        .send({
          query: 'I want a modern condo with good facilities',
          useSemanticSearch: true,
        })
        .expect(200);

      expect(response.body.searchMeta).toHaveProperty('hasSemanticSearch');
      expect(response.body.searchMeta).toHaveProperty('aiProcessing');
      expect(response.body.searchMeta.aiProcessing).toHaveProperty('processed');
    });
  });
});