"""
Unit tests for Intent Service
"""

import pytest
import pytest_asyncio
import asyncio
import numpy as np
from services.intent_service import IntentService


class TestIntentService:
    """Test cases for IntentService functionality"""
    
    @pytest_asyncio.fixture
    async def intent_service(self):
        """Create and initialize intent service for testing"""
        service = IntentService()
        await service.initialize()
        return service
    
    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test that the service initializes correctly"""
        service = IntentService()
        assert not service.is_initialized
        
        await service.initialize()
        assert service.is_initialized
        assert service.model is not None
        assert service.check_model_health()
    
    @pytest.mark.asyncio
    async def test_embedding_generation_consistency(self, intent_service):
        """Test that embedding generation is consistent for the same input"""
        text = "Modern house near school"
        
        # Generate embeddings multiple times
        embedding1 = intent_service.generate_embedding(text)
        embedding2 = intent_service.generate_embedding(text)
        
        # Should be identical for same input
        assert embedding1 == embedding2
        assert len(embedding1) > 0
        assert isinstance(embedding1, list)
        assert all(isinstance(x, float) for x in embedding1)
    
    @pytest.mark.asyncio
    async def test_embedding_generation_different_texts(self, intent_service):
        """Test that different texts produce different embeddings"""
        text1 = "Modern house near school"
        text2 = "Old apartment in city center"
        
        embedding1 = intent_service.generate_embedding(text1)
        embedding2 = intent_service.generate_embedding(text2)
        
        # Should be different for different inputs
        assert embedding1 != embedding2
        assert len(embedding1) == len(embedding2)  # Same dimension
    
    def test_keyword_extraction_english(self):
        """Test keyword extraction from English text"""
        service = IntentService()
        text = "Modern house near school with 3 bedrooms and garden"
        
        keywords = service.extract_keywords(text)
        
        assert isinstance(keywords, list)
        assert "modern" in keywords
        assert "house" in keywords
        assert "school" in keywords
        assert "bedrooms" in keywords
        assert "garden" in keywords
        # Stop words should be filtered out
        assert "with" not in keywords
        assert "and" not in keywords
    
    def test_keyword_extraction_thai(self):
        """Test keyword extraction from Thai text"""
        service = IntentService()
        text = "บ้านใหม่ใกล้โรงเรียน มี 3 ห้องนอน และสวน"
        
        keywords = service.extract_keywords(text)
        
        assert isinstance(keywords, list)
        assert len(keywords) > 0  # Should extract some keywords
        
        # Basic Thai tokenization may not be perfect, but should extract some meaningful parts
        # The important thing is that it doesn't crash and returns a list
    
    def test_price_extraction_thai_million(self):
        """Test price extraction from Thai text with millions"""
        service = IntentService()
        
        # Test various Thai price formats
        test_cases = [
            ("งบไม่เกิน 2 ล้าน", {"max": 2000000}),
            ("ราคา 3.5 ล้าน", {"min": 2800000, "max": 4200000}),
            ("งบประมาณ 1.8 ล้าน", {"min": 1440000, "max": 2160000}),
        ]
        
        for text, expected_range in test_cases:
            result = service.extract_price_range(text)
            assert result is not None
            
            if "max" in expected_range and "min" not in expected_range:
                assert "max" in result
                assert result["max"] == expected_range["max"]
            else:
                assert "min" in result and "max" in result
                assert abs(result["min"] - expected_range["min"]) < 100000
                assert abs(result["max"] - expected_range["max"]) < 100000
    
    def test_price_extraction_english(self):
        """Test price extraction from English text"""
        service = IntentService()
        
        test_cases = [
            ("budget under 2 million", {"max": 2000000}),
            ("price around 1.5 million", {"min": 1200000, "max": 1800000}),
        ]
        
        for text, expected_range in test_cases:
            result = service.extract_price_range(text)
            assert result is not None
            
            if "max" in expected_range and "min" not in expected_range:
                assert result["max"] == expected_range["max"]
    
    def test_location_extraction(self):
        """Test location hint extraction"""
        service = IntentService()
        
        test_cases = [
            ("house near Sukhumvit", ["sukhumvit"]),
            ("บ้านใกล้สุขุมวิท", ["สุขุมวิท"]),
            ("condo around Asok BTS", ["asok", "bts"]),
            ("ใกล้ BTS อโศก", ["bts", "อโศก"]),
        ]
        
        for text, expected_locations in test_cases:
            result = service.extract_location_hints(text)
            assert isinstance(result, list)
            
            for expected_loc in expected_locations:
                assert any(expected_loc.lower() in loc.lower() for loc in result)
    
    def test_property_type_extraction(self):
        """Test property type extraction"""
        service = IntentService()
        
        test_cases = [
            ("modern house for sale", ["house"]),
            ("condo near BTS", ["condo"]),
            ("townhouse with garden", ["townhouse"]),
            ("บ้านใหม่", ["house"]),
            ("คอนโดใกล้รถไฟฟ้า", ["condo"]),
            ("ทาวน์เฮาส์", ["townhouse"]),
        ]
        
        for text, expected_types in test_cases:
            result = service.extract_property_type(text)
            assert result is not None
            assert isinstance(result, list)
            
            for expected_type in expected_types:
                assert expected_type in result
    
    def test_room_requirements_extraction(self):
        """Test room requirements extraction"""
        service = IntentService()
        
        test_cases = [
            ("3 bedroom house", {"bedrooms": 3}),
            ("2 bathroom condo", {"bathrooms": 2}),
            ("4 bedroom 3 bathroom house", {"bedrooms": 4, "bathrooms": 3}),
            ("บ้าน 3 ห้องนอน", {"bedrooms": 3}),
            ("คอนโด 2 ห้องน้ำ", {"bathrooms": 2}),
        ]
        
        for text, expected_rooms in test_cases:
            result = service.extract_room_requirements(text)
            
            if expected_rooms:
                assert result is not None
                for room_type, count in expected_rooms.items():
                    assert result.get(room_type) == count
    
    def test_area_requirements_extraction(self):
        """Test area requirements extraction"""
        service = IntentService()
        
        test_cases = [
            ("house 150 sqm", {"min": 150}),
            ("พื้นที่ 120 ตร.ม.", {"min": 120}),
            ("ขนาด 200 ตร.ม.", {"min": 200}),
        ]
        
        for text, expected_area in test_cases:
            result = service.extract_area_requirements(text)
            
            if expected_area:
                assert result is not None
                assert result["min"] == expected_area["min"]
    
    @pytest.mark.asyncio
    async def test_intent_processing_comprehensive(self, intent_service):
        """Test comprehensive intent processing"""
        query = "บ้านใกล้โรงเรียน 3 ห้องนอน งบไม่เกิน 2 ล้าน"
        
        result = await intent_service.process_intent(query)
        
        # Check all required fields are present
        assert "keywords" in result
        assert "extracted_filters" in result
        assert "embedding" in result
        assert "confidence_score" in result
        assert "processing_time" in result
        assert "intent_summary" in result
        
        # Check data types and ranges
        assert isinstance(result["keywords"], list)
        assert isinstance(result["extracted_filters"], dict)
        assert isinstance(result["embedding"], list)
        assert 0.0 <= result["confidence_score"] <= 1.0
        assert result["processing_time"] > 0
        assert isinstance(result["intent_summary"], str)
        
        # Check specific extractions
        filters = result["extracted_filters"]
        assert "price_range" in filters
        assert "property_type" in filters
        assert "room_requirements" in filters
        
        assert filters["property_type"] == ["house"]
        assert filters["room_requirements"]["bedrooms"] == 3
        assert filters["price_range"]["max"] == 2000000
    
    def test_similarity_calculation_identical(self):
        """Test similarity calculation for identical embeddings"""
        service = IntentService()
        
        embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
        similarity = service.calculate_cosine_similarity(embedding, embedding)
        
        assert abs(similarity - 1.0) < 1e-6  # Should be 1.0 for identical vectors
    
    def test_similarity_calculation_orthogonal(self):
        """Test similarity calculation for orthogonal embeddings"""
        service = IntentService()
        
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [0.0, 1.0, 0.0]
        similarity = service.calculate_cosine_similarity(embedding1, embedding2)
        
        assert abs(similarity - 0.0) < 1e-6  # Should be 0.0 for orthogonal vectors
    
    def test_similarity_calculation_opposite(self):
        """Test similarity calculation for opposite embeddings"""
        service = IntentService()
        
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [-1.0, 0.0, 0.0]
        similarity = service.calculate_cosine_similarity(embedding1, embedding2)
        
        assert abs(similarity - (-1.0)) < 1e-6  # Should be -1.0 for opposite vectors
    
    @pytest.mark.asyncio
    async def test_similarity_calculation_accuracy(self, intent_service):
        """Test similarity calculation accuracy with real embeddings"""
        # Similar texts should have high similarity
        text1 = "Modern house near school"
        text2 = "Contemporary home close to educational facility"
        
        embedding1 = intent_service.generate_embedding(text1)
        embedding2 = intent_service.generate_embedding(text2)
        
        similarity = intent_service.calculate_cosine_similarity(embedding1, embedding2)
        
        # Similar texts should have positive similarity
        assert similarity > 0.3  # Reasonable threshold for similar content
        
        # Very different texts should have lower similarity
        text3 = "Old apartment in busy market area"
        embedding3 = intent_service.generate_embedding(text3)
        
        similarity_different = intent_service.calculate_cosine_similarity(embedding1, embedding3)
        
        # Should be less similar than the first pair
        assert similarity_different < similarity
    
    def test_confidence_score_calculation(self):
        """Test confidence score calculation"""
        service = IntentService()
        
        # Test with comprehensive data
        comprehensive_data = {
            'keywords': ['house', 'school'],
            'price_range': {'max': 2000000},
            'location_hints': ['sukhumvit'],
            'property_type': ['house'],
            'area_requirements': {'min': 100},
            'room_requirements': {'bedrooms': 3}
        }
        
        high_confidence = service.calculate_confidence_score(comprehensive_data)
        assert high_confidence > 0.8
        
        # Test with minimal data
        minimal_data = {
            'keywords': ['house']
        }
        
        low_confidence = service.calculate_confidence_score(minimal_data)
        assert low_confidence < 0.3
        assert low_confidence < high_confidence
    
    def test_intent_summary_generation(self):
        """Test intent summary generation"""
        service = IntentService()
        
        query = "Modern house near school"
        extracted_data = {
            'property_type': ['house'],
            'price_range': {'max': 2000000},
            'location_hints': ['school'],
            'room_requirements': {'bedrooms': 3, 'bathrooms': 2}
        }
        
        summary = service.generate_intent_summary(query, extracted_data)
        
        assert isinstance(summary, str)
        assert len(summary) > 0
        assert "house" in summary.lower()
        assert "2,000,000" in summary or "2000000" in summary
        assert "school" in summary.lower()
        assert "3 bedroom" in summary.lower()
        assert "2 bathroom" in summary.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])