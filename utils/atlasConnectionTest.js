const mongoose = require('mongoose');
require('dotenv').config();

async function testAtlasConnection() {
  try {
    console.log('🧪 Testing MongoDB Atlas connection...');
    
    const atlasUri = process.env.MONGODB_ATLAS_URI;
    
    if (!atlasUri) {
      console.error('❌ MONGODB_ATLAS_URI not found in environment variables');
      console.log('💡 Please set MONGODB_ATLAS_URI in your .env file');
      console.log('💡 Format: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
      return false;
    }
    
    if (!atlasUri.includes('mongodb+srv://')) {
      console.warn('⚠️  URI doesn\'t appear to be a MongoDB Atlas connection string');
      console.log('💡 Atlas URIs should start with mongodb+srv://');
    }
    
    // Extract cluster info for display (without credentials)
    const uriParts = atlasUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
    if (uriParts) {
      console.log(`📍 Username: ${uriParts[1]}`);
      console.log(`📍 Cluster: ${uriParts[3]}`);
      console.log(`📍 Database: ${uriParts[4]}`);
    }
    
    // Connection options optimized for Atlas
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // 10 seconds for Atlas
      socketTimeoutMS: 45000,
      bufferCommands: false,
      retryWrites: true,
      w: 'majority',
    };
    
    console.log('🔄 Attempting connection to MongoDB Atlas...');
    
    await mongoose.connect(atlasUri, options);
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test basic operations
    console.log('🔍 Testing basic database operations...');
    
    // Ping the database
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful');
    
    // Get database stats
    const stats = await mongoose.connection.db.stats();
    console.log('📊 Database stats:', {
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
    });
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections:', collections.map(c => c.name));
    
    // Test a simple write operation
    const testCollection = mongoose.connection.db.collection('connection_test');
    const testDoc = {
      message: 'Atlas connection test',
      timestamp: new Date(),
      nodeVersion: process.version,
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted:', insertResult.insertedId);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('🧹 Test document cleaned up');
    
    console.log('🎉 MongoDB Atlas connection test completed successfully!');
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection test failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('authentication failed')) {
      console.log('💡 Authentication failed - check your username and password');
      console.log('💡 Make sure the database user exists and has proper permissions');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('network timeout')) {
      console.log('💡 Network connection failed - check your connection string');
      console.log('💡 Make sure your IP address is whitelisted in MongoDB Atlas');
    } else if (error.message.includes('bad auth')) {
      console.log('💡 Bad authentication - verify your credentials');
    } else if (error.message.includes('server selection timed out')) {
      console.log('💡 Server selection timeout - check network access and cluster status');
    }
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Verify your MONGODB_ATLAS_URI in the .env file');
    console.log('2. Check that your IP address is whitelisted in MongoDB Atlas');
    console.log('3. Confirm your database user credentials are correct');
    console.log('4. Ensure your cluster is running and accessible');
    
    return false;
    
  } finally {
    // Always disconnect
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB Atlas');
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAtlasConnection().then(success => {
    // eslint-disable-next-line no-process-exit
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAtlasConnection };