const mongoose = require('mongoose');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      // Use MongoDB Atlas URI if available, otherwise fall back to local
      const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-property-search';
      
      // Determine if this is an Atlas connection
      const isAtlas = mongoUri.includes('mongodb+srv://');
      
      // Mongoose connection options optimized for both local and Atlas
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: isAtlas ? 10000 : 5000, // Longer timeout for Atlas
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        retryWrites: true, // Enable retryable writes for Atlas
        w: 'majority', // Write concern for Atlas
      };

      console.log(`🔄 Connecting to MongoDB${isAtlas ? ' Atlas' : ' (local)'}...`);
      
      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log(`✅ MongoDB${isAtlas ? ' Atlas' : ''} connected successfully`);
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      
      // Provide helpful error messages for common Atlas issues
      if (error.message.includes('authentication failed')) {
        console.error('💡 Check your MongoDB Atlas username and password');
      } else if (error.message.includes('network timeout') || error.message.includes('ENOTFOUND')) {
        console.error('💡 Check your MongoDB Atlas connection string and network connectivity');
      } else if (error.message.includes('IP whitelist')) {
        console.error('💡 Make sure your IP address is whitelisted in MongoDB Atlas');
      }
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying connection... (${this.retryCount}/${this.maxRetries})`);
        
        await this.delay(this.retryDelay);
        return this.connect();
      } else {
        console.error('💥 Max retry attempts reached. Could not connect to MongoDB.');
        throw error;
      }
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('🔌 MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  setupEventListeners() {
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error.message);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
      await this.disconnect();
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
      await this.disconnect();
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    });
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new DatabaseConnection();