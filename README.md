# AI Property Search Backend

An AI-powered property search backend system that enables intelligent property discovery through natural language queries, semantic search, and location-based filtering.

## Features

- 🤖 Natural language query processing with AI
- 🔍 Semantic search using vector embeddings
- 📍 Geospatial search and filtering
- 🏠 Property CRUD operations
- 📊 Relevance-based ranking
- 🚀 RESTful API with comprehensive documentation

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Engine**: FastAPI with Sentence-BERT
- **Validation**: Joi
- **Testing**: Jest with Supertest
- **Code Quality**: ESLint + Prettier

## Prerequisites

- Node.js (>= 16.0.0)
- MongoDB (local or Atlas)
- Python 3.8+ (for AI engine)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ai-property-search-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   - Local: `mongod`
   - Or use MongoDB Atlas connection string

## Development

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

### Development Workflow

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **The server will be available at**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health

3. **Code quality checks**
   ```bash
   npm run lint
   npm run format
   npm test
   ```

## Project Structure

```
├── controllers/     # Request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── middleware/      # Express middleware
├── models/          # Database schemas
├── routes/          # API routes
├── config/          # Configuration files
├── utils/           # Utility functions
├── tests/           # Test files
├── logs/            # Application logs
├── server.js        # Application entry point
└── package.json     # Dependencies and scripts
```

## Environment Variables

| Variable        | Description               | Default                                        |
| --------------- | ------------------------- | ---------------------------------------------- |
| `PORT`          | Server port               | `3000`                                         |
| `NODE_ENV`      | Environment               | `development`                                  |
| `MONGODB_URI`   | MongoDB connection string | `mongodb://localhost:27017/ai-property-search` |
| `AI_ENGINE_URL` | FastAPI AI engine URL     | `http://localhost:8000`                        |
| `CORS_ORIGIN`   | CORS allowed origin       | `http://localhost:3000`                        |
| `LOG_LEVEL`     | Logging level             | `info`                                         |

## API Documentation

Once the server is running, API documentation will be available at:

- Swagger UI: http://localhost:3000/api/docs (coming soon)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License
