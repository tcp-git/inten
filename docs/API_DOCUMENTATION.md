# AI Property Search Backend API Documentation

## Overview

The AI Property Search Backend API provides intelligent property discovery through natural language queries, semantic search, and location-based filtering. This comprehensive guide covers all API endpoints, authentication, error handling, and best practices.

## 🚀 Quick Start

### Base URL
- **Development**: `http://localhost:3000`
- **Interactive Documentation**: `http://localhost:3000/api/docs`

### API Endpoints Overview
- **Properties**: `/api/properties/*` - Property management and search
- **Health**: `/health/*` - System health monitoring
- **Documentation**: `/api/docs` - Interactive API documentation

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Property Endpoints](#property-endpoints)
6. [Search Functionality](#search-functionality)
7. [Health Monitoring](#health-monitoring)
8. [Examples](#examples)
9. [Best Practices](#best-practices)

## 🔐 Authentication

Currently, all endpoints are public for development purposes. In production:

- Property management operations (Create, Update, Delete) should require authentication
- Consider implementing JWT tokens or API keys
- Rate limiting should be user-specific rather than IP-based

### Future Authentication Headers
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
```

## 🚦 Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers
- **Exceeded**: Returns 429 status code with retry information

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## 📊 Response Format

All API responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

## ❌ Error Handling

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input parameters | 400 |
| `PROPERTY_NOT_FOUND` | Property does not exist | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `AI_SERVICE_UNAVAILABLE` | AI service is down | 503 |
| `DATABASE_ERROR` | Database connection issues | 500 |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | 500 |

### Validation Errors

Validation errors include detailed field-level information:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number",
        "value": -1000,
        "constraint": "min:0"
      }
    ]
  }
}
```

## 🏠 Property Endpoints

### Create Property
```http
POST /api/properties
Content-Type: application/json

{
  "title": "Modern House Near BTS",
  "description": "Beautiful 3-bedroom house...",
  "price": 3500000,
  "propertyType": "house",
  "area": 150.5,
  "location": {
    "type": "Point",
    "coordinates": [100.5018, 13.7563],
    "address": "123 Sukhumvit Road, Bangkok"
  }
}
```

### Get Property by ID
```http
GET /api/properties/{id}
```

### Update Property
```http
PUT /api/properties/{id}
Content-Type: application/json

{
  "price": 3800000,
  "status": "available"
}
```

### Delete Property
```http
DELETE /api/properties/{id}
```

### List Properties
```http
GET /api/properties?page=1&limit=20&propertyType=house&minPrice=2000000
```

## 🔍 Search Functionality

### Natural Language Search

The API supports intelligent search in Thai and English:

```http
POST /api/properties/search
Content-Type: application/json

{
  "query": "บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน",
  "useSemanticSearch": true,
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### Location-Based Search

Search properties within a specific geographic area:

```http
POST /api/properties/search
Content-Type: application/json

{
  "location": {
    "coordinates": [100.5018, 13.7563],
    "radius": 5
  },
  "filters": {
    "propertyType": ["house", "condo"],
    "minPrice": 2000000,
    "maxPrice": 5000000
  }
}
```

### Filter-Based Search

Search using specific criteria without text query:

```http
POST /api/properties/search
Content-Type: application/json

{
  "filters": {
    "propertyType": "condo",
    "bedrooms": 2,
    "status": "available"
  },
  "sortBy": "price_asc"
}
```

### Search Response

```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Modern House Near School",
        "price": 2800000,
        "location": {
          "coordinates": [100.5018, 13.7563],
          "distance": 1.2
        },
        "relevanceScore": 0.92,
        "semanticScore": 0.89,
        "locationScore": 0.95
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalResults": 47,
      "hasNext": true
    },
    "searchMeta": {
      "aiProcessingTime": 1.8,
      "dbQueryTime": 0.3,
      "extractedIntent": "Find family house near educational facilities"
    }
  }
}
```

## 🎯 Similar Properties

Find properties similar to a given property:

```http
GET /api/properties/{id}/similar?limit=10&threshold=0.7
```

Calculate similarity between two properties:

```http
GET /api/properties/{id1}/similarity/{id2}
```

## 📊 Property Statistics

Get comprehensive property statistics:

```http
GET /api/properties/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalProperties": 1250,
    "byType": {
      "house": 450,
      "condo": 600,
      "townhouse": 150,
      "land": 50
    },
    "priceRange": {
      "min": 500000,
      "max": 50000000,
      "average": 3500000
    }
  }
}
```

## 🏥 Health Monitoring

### Basic Health Check
```http
GET /health
```

### Detailed Health Check
```http
GET /health/detailed
```

Response includes:
- Database connectivity
- AI service availability
- System resources
- Performance metrics

## 📝 Examples

### Thai Language Search
```bash
curl -X POST http://localhost:3000/api/properties/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "คอนโดใกล้ BTS มีสระว่ายน้ำ",
    "pagination": {"page": 1, "limit": 10}
  }'
```

### English Semantic Search
```bash
curl -X POST http://localhost:3000/api/properties/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "spacious family home with garden near good schools",
    "useSemanticSearch": true
  }'
```

### Create Property
```bash
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Modern Condo with City View",
    "description": "Luxury 2-bedroom condo on 25th floor",
    "price": 4500000,
    "propertyType": "condo",
    "area": 75,
    "location": {
      "type": "Point",
      "coordinates": [100.5412, 13.7563],
      "address": "456 Sky Tower, Silom, Bangkok"
    }
  }'
```

## 🎯 Best Practices

### Search Optimization
1. **Use Semantic Search**: Enable `useSemanticSearch: true` for natural language queries
2. **Combine Filters**: Use both text queries and filters for precise results
3. **Pagination**: Always implement pagination for large result sets
4. **Caching**: Cache frequent searches on the client side

### Error Handling
1. **Check Success Flag**: Always check the `success` field in responses
2. **Handle Fallbacks**: Implement fallback logic when AI service is unavailable
3. **Retry Logic**: Implement exponential backoff for rate limit errors
4. **Log Request IDs**: Use `requestId` for debugging and support

### Performance
1. **Limit Results**: Use appropriate `limit` values (10-50 recommended)
2. **Specific Filters**: Use specific filters to reduce search scope
3. **Monitor Response Times**: Track `aiProcessingTime` and `dbQueryTime`
4. **Health Checks**: Regularly monitor `/health/detailed` endpoint

### Data Validation
1. **Validate Coordinates**: Ensure longitude/latitude are valid
2. **Price Ranges**: Validate price inputs are positive numbers
3. **Required Fields**: Always provide required fields for property creation
4. **Image URLs**: Validate image URLs are accessible

## 🔧 Development Tools

### Interactive Documentation
Visit `http://localhost:3000/api/docs` for:
- Interactive API testing
- Request/response examples
- Schema validation
- Authentication testing (when implemented)

### Health Monitoring
Use `/health/detailed` for:
- Database connection status
- AI service availability
- System performance metrics
- Error rate monitoring

### Debugging
- All responses include `requestId` for tracing
- Enable development logging for detailed request/response logs
- Use Swagger UI for testing individual endpoints

## 📞 Support

For API support and questions:
- **Documentation**: `/api/docs`
- **Health Status**: `/health`
- **GitHub Issues**: [Repository Issues](https://github.com/example/ai-property-search-backend/issues)
- **Email**: api-support@example.com

---

*This documentation is automatically updated with each API version. Last updated: January 2024*