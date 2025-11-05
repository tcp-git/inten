"""
FastAPI AI Engine for Property Search
Provides natural language processing and semantic search capabilities
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime

from services.intent_service import IntentService
from models.request_models import (
    HealthResponse, QueryRequest, IntentResponse, 
    TextRequest, EmbeddingResponse, SimilarityRequest, SimilarityResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global service instance
intent_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events"""
    global intent_service
    
    # Startup
    logger.info("Starting AI Engine...")
    try:
        intent_service = IntentService()
        await intent_service.initialize()
        logger.info("AI Engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI Engine: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Engine...")


# Create FastAPI application
app = FastAPI(
    title="Property Search AI Engine",
    description="AI-powered natural language processing for property search",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify service availability"""
    try:
        # Check if intent service is initialized and working
        if intent_service is None:
            raise HTTPException(status_code=503, detail="AI service not initialized")
        
        # Test model availability
        model_status = intent_service.check_model_health()
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            service="ai-engine",
            version="1.0.0",
            model_loaded=model_status,
            message="AI Engine is running successfully"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with basic service information"""
    return {
        "service": "Property Search AI Engine",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "intent": "/intent",
            "embedding": "/embedding",
            "similarity": "/similarity",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }


@app.post("/intent", response_model=IntentResponse)
async def detect_intent(request: QueryRequest):
    """Process natural language query and extract search intent"""
    try:
        if intent_service is None:
            raise HTTPException(status_code=503, detail="AI service not initialized")
        
        # Process the query
        result = await intent_service.process_intent(request.query)
        
        return IntentResponse(**result)
        
    except Exception as e:
        logger.error(f"Intent detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Intent processing failed: {str(e)}")


@app.post("/embedding", response_model=EmbeddingResponse)
async def generate_embedding(request: TextRequest):
    """Generate semantic embedding for given text"""
    try:
        if intent_service is None:
            raise HTTPException(status_code=503, detail="AI service not initialized")
        
        start_time = time.time()
        
        # Generate embedding
        embedding = intent_service.generate_embedding(request.text)
        
        processing_time = time.time() - start_time
        
        return EmbeddingResponse(
            embedding=embedding,
            text_length=len(request.text),
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@app.post("/similarity", response_model=SimilarityResponse)
async def calculate_similarity(request: SimilarityRequest):
    """Calculate cosine similarity between two embeddings"""
    try:
        if intent_service is None:
            raise HTTPException(status_code=503, detail="AI service not initialized")
        
        start_time = time.time()
        
        # Calculate similarity
        similarity_score = intent_service.calculate_cosine_similarity(
            request.embedding1, 
            request.embedding2
        )
        
        processing_time = time.time() - start_time
        
        return SimilarityResponse(
            similarity_score=similarity_score,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Similarity calculation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity calculation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )