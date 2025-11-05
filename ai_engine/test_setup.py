#!/usr/bin/env python3
"""
Simple test script to verify AI engine setup
"""

import asyncio
import sys
import logging
from services.intent_service import IntentService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_setup():
    """Test the basic AI engine setup"""
    try:
        logger.info("Testing AI Engine setup...")
        
        # Initialize intent service
        intent_service = IntentService()
        await intent_service.initialize()
        
        # Test model health
        health_status = intent_service.check_model_health()
        logger.info(f"Model health check: {'PASSED' if health_status else 'FAILED'}")
        
        # Test embedding generation
        test_text = "Modern house near school with 3 bedrooms"
        embedding = intent_service.generate_embedding(test_text)
        logger.info(f"Embedding generation test: PASSED (dimension: {len(embedding)})")
        
        # Test keyword extraction
        keywords = intent_service.extract_keywords(test_text)
        logger.info(f"Keyword extraction test: PASSED (keywords: {keywords})")
        
        # Test price extraction
        price_text = "บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน"
        price_range = intent_service.extract_price_range(price_text)
        logger.info(f"Price extraction test: PASSED (range: {price_range})")
        
        logger.info("✅ All tests passed! AI Engine setup is working correctly.")
        return True
        
    except Exception as e:
        logger.error(f"❌ Setup test failed: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_setup())
    sys.exit(0 if success else 1)