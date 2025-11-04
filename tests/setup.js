// Jest setup file for global test configuration
require('dotenv').config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-property-search-test';

// Global test timeout
jest.setTimeout(10000);

// Suppress console.log during tests unless explicitly needed
if (process.env.SUPPRESS_TEST_LOGS !== 'false') {
  /* eslint-disable no-console */
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error, // Keep error logs for debugging
  };
  /* eslint-enable no-console */
}
