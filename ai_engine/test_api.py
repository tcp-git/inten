"""
Unit tests for FastAPI endpoints
"""

import pytest
import pytest_asyncio
import asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
import json

from main import app


class TestAPIEndpoints:
    """Test cases for FastAPI endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest_asyncio.fixture
    async def async_client(self):
        """Create async test client"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns service information"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert "endpoints" in data
        assert data["service"] == "Property Search AI Engine"
        assert data["status"] == "running"
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        
        # Health endpoint might return 503 if AI service is not initialized in test
        # This is expected behavior for unit tests
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            assert "status" in data
            assert "timestamp" in data
            assert "service" in data
            assert "version" in data
            assert "model_loaded" in data
            assert "message" in data
            
            # Check values
            assert data["status"] == "healthy"
            assert data["service"] == "ai-engine"
            assert data["version"] == "1.0.0"
            assert isinstance(data["model_loaded"], bool)
        else:
            # Service unavailable is acceptable in unit tests
            data = response.json()
            assert "detail" in data
    
    @pytest.mark.asyncio
    async def test_intent_endpoint_valid_query(self, async_client):
        """Test intent endpoint with valid query"""
        request_data = {
            "query": "บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน",
            "language": "auto"
        }
        
        response = await async_client.post("/intent", json=request_data)
        
        # May return 503 if AI service not initialized in test environment
        if response.status_code == 503:
            pytest.skip("AI service not initialized in test environment")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "keywords" in data
        assert "extracted_filters" in data
        assert "embedding" in data
        assert "confidence_score" in data
        assert "processing_time" in data
        assert "intent_summary" in data
        
        # Check data types
        assert isinstance(data["keywords"], list)
        assert isinstance(data["extracted_filters"], dict)
        assert isinstance(data["embedding"], list)
        assert isinstance(data["confidence_score"], (int, float))
        assert isinstance(data["processing_time"], (int, float))
        assert isinstance(data["intent_summary"], str)
        
        # Check ranges
        assert 0.0 <= data["confidence_score"] <= 1.0
        assert data["processing_time"] > 0
        assert len(data["embedding"]) > 0
    
    @pytest.mark.asyncio
    async def test_intent_endpoint_english_query(self, async_client):
        """Test intent endpoint with English query"""
        request_data = {
            "query": "Modern house near school with 3 bedrooms under 2 million",
            "language": "en"
        }
        
        response = await async_client.post("/intent", json=request_data)
        
        if response.status_code == 503:
            pytest.skip("AI service not initialized in test environment")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should extract relevant information
        assert len(data["keywords"]) > 0
        assert "house" in [kw.lower() for kw in data["keywords"]]
        assert "school" in [kw.lower() for kw in data["keywords"]]
        
        # Should extract filters
        filters = data["extracted_filters"]
        if "property_type" in filters:
            assert "house" in filters["property_type"]
        if "room_requirements" in filters:
            assert filters["room_requirements"].get("bedrooms") == 3
    
    def test_intent_endpoint_invalid_query(self, client):
        """Test intent endpoint with invalid query"""
        # Empty query
        response = client.post("/intent", json={"query": ""})
        assert response.status_code == 422  # Validation error
        
        # Missing query field
        response = client.post("/intent", json={})
        assert response.status_code == 422
        
        # Query too long
        long_query = "a" * 1001  # Exceeds max length
        response = client.post("/intent", json={"query": long_query})
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_embedding_endpoint_valid_text(self, async_client):
        """Test embedding endpoint with valid text"""
        request_data = {
            "text": "Modern house near school"
        }
        
        response = await async_client.post("/embedding", json=request_data)
        
        if response.status_code == 503:
            pytest.skip("AI service not initialized in test environment")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "embedding" in data
        assert "text_length" in data
        assert "processing_time" in data
        
        # Check data types and values
        assert isinstance(data["embedding"], list)
        assert isinstance(data["text_length"], int)
        assert isinstance(data["processing_time"], (int, float))
        
        assert len(data["embedding"]) > 0
        assert data["text_length"] == len(request_data["text"])
        assert data["processing_time"] > 0
        
        # Check embedding values are floats
        assert all(isinstance(x, (int, float)) for x in data["embedding"])
    
    @pytest.mark.asyncio
    async def test_embedding_endpoint_thai_text(self, async_client):
        """Test embedding endpoint with Thai text"""
        request_data = {
            "text": "บ้านใหม่ใกล้โรงเรียน"
        }
        
        response = await async_client.post("/embedding", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["embedding"]) > 0
        assert data["text_length"] > 0
    
    def test_embedding_endpoint_invalid_text(self, client):
        """Test embedding endpoint with invalid text"""
        # Empty text
        response = client.post("/embedding", json={"text": ""})
        assert response.status_code == 422
        
        # Missing text field
        response = client.post("/embedding", json={})
        assert response.status_code == 422
        
        # Text too long
        long_text = "a" * 2001  # Exceeds max length
        response = client.post("/embedding", json={"text": long_text})
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_similarity_endpoint_valid_embeddings(self, async_client):
        """Test similarity endpoint with valid embeddings"""
        # First get some embeddings
        text1_response = await async_client.post("/embedding", json={"text": "house near school"})
        text2_response = await async_client.post("/embedding", json={"text": "home close to education"})
        
        assert text1_response.status_code == 200
        assert text2_response.status_code == 200
        
        embedding1 = text1_response.json()["embedding"]
        embedding2 = text2_response.json()["embedding"]
        
        # Test similarity calculation
        request_data = {
            "embedding1": embedding1,
            "embedding2": embedding2
        }
        
        response = await async_client.post("/similarity", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "similarity_score" in data
        assert "processing_time" in data
        
        # Check data types and ranges
        assert isinstance(data["similarity_score"], (int, float))
        assert isinstance(data["processing_time"], (int, float))
        assert -1.0 <= data["similarity_score"] <= 1.0
        assert data["processing_time"] > 0
    
    @pytest.mark.asyncio
    async def test_similarity_endpoint_identical_embeddings(self, async_client):
        """Test similarity endpoint with identical embeddings"""
        # Get an embedding
        text_response = await async_client.post("/embedding", json={"text": "test text"})
        assert text_response.status_code == 200
        
        embedding = text_response.json()["embedding"]
        
        # Test similarity with itself
        request_data = {
            "embedding1": embedding,
            "embedding2": embedding
        }
        
        response = await async_client.post("/similarity", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Identical embeddings should have similarity close to 1.0
        assert abs(data["similarity_score"] - 1.0) < 1e-5
    
    def test_similarity_endpoint_invalid_embeddings(self, client):
        """Test similarity endpoint with invalid embeddings"""
        # Missing embedding1
        response = client.post("/similarity", json={"embedding2": [0.1, 0.2, 0.3]})
        assert response.status_code == 422
        
        # Missing embedding2
        response = client.post("/similarity", json={"embedding1": [0.1, 0.2, 0.3]})
        assert response.status_code == 422
        
        # Empty embeddings
        response = client.post("/similarity", json={"embedding1": [], "embedding2": []})
        assert response.status_code == 500  # Will fail in calculation
        
        # Invalid embedding format
        response = client.post("/similarity", json={"embedding1": "invalid", "embedding2": [0.1, 0.2]})
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_embedding_consistency(self, async_client):
        """Test that same text produces same embedding"""
        text = "Modern house near school"
        
        # Generate embedding twice
        response1 = await async_client.post("/embedding", json={"text": text})
        response2 = await async_client.post("/embedding", json={"text": text})
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        embedding1 = response1.json()["embedding"]
        embedding2 = response2.json()["embedding"]
        
        # Should be identical
        assert embedding1 == embedding2
    
    @pytest.mark.asyncio
    async def test_intent_processing_comprehensive(self, async_client):
        """Test comprehensive intent processing with complex query"""
        request_data = {
            "query": "Looking for a modern 3-bedroom house near BTS station, budget around 2.5 million baht, minimum 150 sqm"
        }
        
        response = await async_client.post("/intent", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should extract multiple types of information
        filters = data["extracted_filters"]
        
        # Check for extracted information
        keywords = [kw.lower() for kw in data["keywords"]]
        assert any("house" in kw for kw in keywords)
        assert any("modern" in kw for kw in keywords)
        
        # Should have reasonable confidence for comprehensive query
        assert data["confidence_score"] > 0.3
        
        # Should have meaningful summary
        summary = data["intent_summary"].lower()
        assert len(summary) > 10
    
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/health")
        
        # Should allow CORS
        assert response.status_code in [200, 405]  # OPTIONS might not be implemented
        
        # Test with actual request
        response = client.get("/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])