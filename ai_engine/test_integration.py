"""
Integration tests for AI Engine - requires model initialization
Run these tests separately when you want to test the full functionality
"""

import pytest
import pytest_asyncio
import asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient

from main import app
from services.intent_service import IntentService


class TestIntegration:
    """Integration tests that require full AI service initialization"""
    
    @pytest_asyncio.fixture(scope="class")
    async def initialized_service(self):
        """Initialize the AI service for integration tests"""
        service = IntentService()
        await service.initialize()
        return service
    
    @pytest.mark.asyncio
    async def test_full_intent_processing_flow(self, initialized_service):
        """Test the complete intent processing flow"""
        query = "บ้านใกล้โรงเรียน 3 ห้องนอน งบไม่เกิน 2 ล้าน"
        
        # Process intent
        result = await initialized_service.process_intent(query)
        
        # Verify all components work together
        assert "keywords" in result
        assert "extracted_filters" in result
        assert "embedding" in result
        assert "confidence_score" in result
        assert "processing_time" in result
        assert "intent_summary" in result
        
        # Verify specific extractions
        filters = result["extracted_filters"]
        assert "price_range" in filters
        assert "property_type" in filters
        assert "room_requirements" in filters
        
        # Verify extracted values
        assert filters["property_type"] == ["house"]
        assert filters["room_requirements"]["bedrooms"] == 3
        assert filters["price_range"]["max"] == 2000000
        
        # Verify embedding quality
        embedding = result["embedding"]
        assert len(embedding) > 0
        assert all(isinstance(x, float) for x in embedding)
        
        # Verify confidence and summary
        assert 0.0 <= result["confidence_score"] <= 1.0
        assert len(result["intent_summary"]) > 0
        assert "house" in result["intent_summary"].lower()
    
    @pytest.mark.asyncio
    async def test_embedding_similarity_accuracy(self, initialized_service):
        """Test embedding similarity calculations for accuracy"""
        # Similar property descriptions
        text1 = "Modern 3-bedroom house near school with garden"
        text2 = "Contemporary home with 3 bedrooms close to educational facility and yard"
        
        # Very different property
        text3 = "Old studio apartment in busy commercial area"
        
        # Generate embeddings
        embedding1 = initialized_service.generate_embedding(text1)
        embedding2 = initialized_service.generate_embedding(text2)
        embedding3 = initialized_service.generate_embedding(text3)
        
        # Calculate similarities
        similarity_similar = initialized_service.calculate_cosine_similarity(embedding1, embedding2)
        similarity_different = initialized_service.calculate_cosine_similarity(embedding1, embedding3)
        
        # Similar properties should have higher similarity
        assert similarity_similar > similarity_different
        assert similarity_similar > 0.3  # Reasonable threshold for similar content
        
        # Test self-similarity
        similarity_self = initialized_service.calculate_cosine_similarity(embedding1, embedding1)
        assert abs(similarity_self - 1.0) < 1e-6
    
    @pytest.mark.asyncio
    async def test_multilingual_processing(self, initialized_service):
        """Test processing of both Thai and English queries"""
        # Thai query
        thai_query = "คอนโดใกล้ BTS 2 ห้องนอน งบ 3 ล้าน"
        thai_result = await initialized_service.process_intent(thai_query)
        
        # English query with similar meaning
        english_query = "Condo near BTS 2 bedrooms budget 3 million"
        english_result = await initialized_service.process_intent(english_query)
        
        # Both should extract similar information
        thai_filters = thai_result["extracted_filters"]
        english_filters = english_result["extracted_filters"]
        
        # Both should identify condo
        if "property_type" in thai_filters:
            assert "condo" in thai_filters["property_type"]
        if "property_type" in english_filters:
            assert "condo" in english_filters["property_type"]
        
        # Both should extract 2 bedrooms
        if "room_requirements" in thai_filters:
            assert thai_filters["room_requirements"].get("bedrooms") == 2
        if "room_requirements" in english_filters:
            assert english_filters["room_requirements"].get("bedrooms") == 2
        
        # Both should have BTS in location hints
        if "location_hints" in thai_filters:
            assert any("bts" in hint.lower() for hint in thai_filters["location_hints"])
        if "location_hints" in english_filters:
            assert any("bts" in hint.lower() for hint in english_filters["location_hints"])
    
    @pytest.mark.asyncio
    async def test_complex_query_processing(self, initialized_service):
        """Test processing of complex queries with multiple requirements"""
        complex_query = """
        Looking for a modern house or townhouse near good schools in Sukhumvit area.
        Need at least 3 bedrooms and 2 bathrooms, minimum 150 sqm.
        Budget is flexible but prefer under 5 million baht.
        Must have parking and garden space.
        """
        
        result = await initialized_service.process_intent(complex_query)
        
        # Should extract multiple property types
        filters = result["extracted_filters"]
        if "property_type" in filters:
            property_types = filters["property_type"]
            assert any(ptype in ["house", "townhouse"] for ptype in property_types)
        
        # Should extract room requirements
        if "room_requirements" in filters:
            rooms = filters["room_requirements"]
            assert rooms.get("bedrooms", 0) >= 3
            assert rooms.get("bathrooms", 0) >= 2
        
        # Should extract area requirements
        if "area_requirements" in filters:
            assert filters["area_requirements"].get("min", 0) >= 150
        
        # Should extract location hints
        if "location_hints" in filters:
            locations = [loc.lower() for loc in filters["location_hints"]]
            assert any("sukhumvit" in loc for loc in locations)
            assert any("school" in loc for loc in locations)
        
        # Should have high confidence for detailed query
        assert result["confidence_score"] > 0.5
        
        # Should have comprehensive summary
        summary = result["intent_summary"].lower()
        assert len(summary) > 20
    
    @pytest.mark.asyncio 
    async def test_edge_cases(self, initialized_service):
        """Test edge cases and error handling"""
        # Very short query
        short_result = await initialized_service.process_intent("house")
        assert "keywords" in short_result
        assert len(short_result["keywords"]) > 0
        
        # Query with numbers only
        number_result = await initialized_service.process_intent("2 3 150")
        assert "keywords" in number_result
        
        # Query with special characters
        special_result = await initialized_service.process_intent("house!@#$%^&*()")
        assert "keywords" in special_result
        
        # Mixed language query
        mixed_result = await initialized_service.process_intent("Modern บ้าน near โรงเรียน")
        assert "keywords" in mixed_result
        assert len(mixed_result["keywords"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])