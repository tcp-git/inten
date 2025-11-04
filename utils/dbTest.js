const database = require('../config/database');

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Setup event listeners
    database.setupEventListeners();
    
    // Connect to database
    await database.connect();
    
    // Test basic operations
    const mongoose = require('mongoose');
    
    // Ping the database
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful');
    
    // Get database stats
    const stats = await mongoose.connection.db.stats();
    console.log('📊 Database stats:', {
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
    });
    
    // Test connection status
    const status = database.getConnectionStatus();
    console.log('🔍 Connection status:', status);
    
    console.log('✅ Database connection test completed successfully');
    
    // Disconnect
    await database.disconnect();
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };