"""
Configuration settings for the AI Engine
"""

import os
from typing import Optional


class Settings:
    """Application settings and configuration"""
    
    # Server settings
    HOST: str = os.getenv("AI_ENGINE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_ENGINE_PORT", "8001"))
    
    # Model settings
    MODEL_NAME: str = os.getenv("SENTENCE_BERT_MODEL", "all-MiniLM-L6-v2")
    MODEL_CACHE_DIR: Optional[str] = os.getenv("MODEL_CACHE_DIR", None)
    
    # API settings
    MAX_QUERY_LENGTH: int = int(os.getenv("MAX_QUERY_LENGTH", "1000"))
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "2000"))
    
    # CORS settings
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Performance settings
    EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))


# Global settings instance
settings = Settings()