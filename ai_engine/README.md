# Property Search AI Engine

FastAPI-based AI service for natural language processing and semantic search capabilities in the property search system.

## Features

- Natural language query processing
- Intent detection and parameter extraction
- Semantic embedding generation using Sentence-BERT
- Text similarity calculations
- Support for Thai and English languages

## Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

1. Navigate to the AI engine directory:
```bash
cd ai_engine
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Service

#### Development Mode

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Endpoints

### Health Check
- **GET** `/health` - Service health status
- **GET** `/` - Basic service information

### Documentation
- **GET** `/docs` - Interactive API documentation (Swagger UI)
- **GET** `/redoc` - Alternative API documentation

## Configuration

Environment variables can be used to configure the service:

- `AI_ENGINE_HOST` - Server host (default: 0.0.0.0)
- `AI_ENGINE_PORT` - Server port (default: 8001)
- `SENTENCE_BERT_MODEL` - Model name (default: all-MiniLM-L6-v2)
- `LOG_LEVEL` - Logging level (default: INFO)
- `MAX_QUERY_LENGTH` - Maximum query length (default: 1000)

## Model Information

The service uses Sentence-BERT (all-MiniLM-L6-v2) for generating semantic embeddings:
- Model size: ~90MB
- Embedding dimension: 384
- Languages: Multilingual (including Thai and English)
- Performance: Fast inference suitable for real-time applications

## Development

### Project Structure

```
ai_engine/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration settings
├── requirements.txt     # Python dependencies
├── models/              # Pydantic request/response models
│   ├── __init__.py
│   └── request_models.py
└── services/            # Business logic services
    ├── __init__.py
    └── intent_service.py # Intent detection and NLP processing
```

### Adding New Features

1. Define request/response models in `models/request_models.py`
2. Implement business logic in appropriate service files
3. Add API endpoints in `main.py`
4. Update documentation and tests

## Monitoring

The service provides health check endpoints for monitoring:
- Service availability
- Model loading status
- Basic functionality verification

## Integration

This AI engine is designed to work with the Node.js property search backend. The main backend service communicates with this AI engine via HTTP requests to process natural language queries and generate semantic embeddings.