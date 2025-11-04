const mongoose = require('mongoose');
const Property = require('../models/Property');
require('dotenv').config();

/**
 * Demo script to showcase Property model functionality
 * This script demonstrates:
 * 1. Schema validation
 * 2. Index creation
 * 3. Virtual properties
 * 4. Instance methods
 * 5. Static methods
 */

async function demonstratePropertyModel() {
  try {
    console.log('🚀 Property Model Demonstration\n');

    // Connect to database (optional - for full demo)
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-property-search-demo';
    
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB for full demonstration');
    } catch (error) {
      console.log('⚠️  MongoDB not available - running schema validation only');
      console.log('   To see full demo, ensure MongoDB is running\n');
    }

    // 1. Schema Validation Demo
    console.log('📋 1. Schema Validation Demo');
    console.log('================================');

    const validProperty = new Property({
      title: 'Modern Condo Near BTS Asok',
      description: 'Beautiful 2-bedroom condo with city view, fully furnished with modern amenities including swimming pool, gym, and 24/7 security',
      price: 3500000,
      propertyType: 'condo',
      area: 85,
      rooms: {
        bedrooms: 2,
        bathrooms: 2
      },
      location: {
        type: 'Point',
        coordinates: [100.5412, 13.7563], // Bangkok coordinates
        address: '123 Sukhumvit Road, Watthana, Bangkok 10110',
        district: 'Watthana',
        province: 'Bangkok'
      },
      features: ['Swimming Pool', 'Gym', 'Security', 'Parking', 'BTS Access'],
      contact: {
        name: 'John Doe',
        phone: '0812345678',
        email: 'john@example.com'
      }
    });

    console.log('✅ Valid property created successfully');
    console.log(`   Title: ${validProperty.title}`);
    console.log(`   Price: ${validProperty.formattedPrice}`);
    console.log(`   Price per sqm: ฿${validProperty.pricePerSqm.toLocaleString()}`);
    console.log(`   Location: [${validProperty.location.coordinates.join(', ')}]`);

    // Test validation errors
    console.log('\n🔍 Testing validation errors:');
    
    const invalidProperty = new Property({
      title: 'Bad', // Too short
      price: -1000, // Negative price
      propertyType: 'invalid', // Invalid enum
      area: 0, // Invalid area
    });

    const validationError = invalidProperty.validateSync();
    if (validationError) {
      console.log('✅ Validation correctly caught errors:');
      Object.keys(validationError.errors).forEach(field => {
        console.log(`   - ${field}: ${validationError.errors[field].message}`);
      });
    }

    // 2. Virtual Properties Demo
    console.log('\n💰 2. Virtual Properties Demo');
    console.log('===============================');
    console.log(`Formatted Price: ${validProperty.formattedPrice}`);
    console.log(`Price per Square Meter: ฿${validProperty.pricePerSqm.toLocaleString()}`);

    // 3. Instance Methods Demo
    console.log('\n📍 3. Instance Methods Demo');
    console.log('============================');
    
    // Calculate distance to Siam Paragon (another Bangkok location)
    const siamParagonLng = 100.5350;
    const siamParagonLat = 13.7460;
    const distance = validProperty.calculateDistance(siamParagonLng, siamParagonLat);
    console.log(`Distance to Siam Paragon: ${distance} km`);

    // 4. Schema Structure Demo
    console.log('\n🏗️  4. Schema Structure Demo');
    console.log('==============================');
    
    const schema = Property.schema;
    console.log('Schema paths (sample):');
    console.log(`   - title: ${schema.paths.title ? '✅' : '❌'}`);
    console.log(`   - price: ${schema.paths.price ? '✅' : '❌'}`);
    console.log(`   - location.coordinates: ${schema.paths['location.coordinates'] ? '✅' : '❌'}`);
    console.log(`   - rooms.bedrooms: ${schema.paths['rooms.bedrooms'] ? '✅' : '❌'}`);

    // 5. Indexes Demo
    console.log('\n📊 5. Indexes Configuration');
    console.log('=============================');
    
    const indexes = schema.indexes();
    console.log(`Total indexes defined: ${indexes.length}`);
    
    // Check for specific indexes
    const geoIndex = indexes.find(index => index[0] && index[0].location === '2dsphere');
    const textIndex = indexes.find(index => index[0] && index[0].title === 'text');
    const priceTypeIndex = indexes.find(index => index[0] && index[0].price === 1 && index[0].propertyType === 1);
    
    console.log(`   - Geospatial index (2dsphere): ${geoIndex ? '✅' : '❌'}`);
    console.log(`   - Text search index: ${textIndex ? '✅' : '❌'}`);
    console.log(`   - Price + Type compound index: ${priceTypeIndex ? '✅' : '❌'}`);

    // 6. Database Operations Demo (if connected)
    if (mongoose.connection.readyState === 1) {
      console.log('\n💾 6. Database Operations Demo');
      console.log('===============================');
      
      // Clear any existing test data
      await Property.deleteMany({ title: /Demo|Test/ });
      
      // Save the valid property
      const savedProperty = await validProperty.save();
      console.log('✅ Property saved to database');
      console.log(`   ID: ${savedProperty._id}`);
      console.log(`   Created: ${savedProperty.createdAt}`);

      // Create additional test properties
      const testProperties = [
        {
          title: 'Luxury House with Pool Demo',
          description: 'Spacious 4-bedroom house with private swimming pool and garden in quiet neighborhood',
          price: 8500000,
          propertyType: 'house',
          area: 250,
          rooms: { bedrooms: 4, bathrooms: 3 },
          location: {
            type: 'Point',
            coordinates: [100.5612, 13.7763],
            address: '456 Luxury Avenue, Bangkok'
          },
          features: ['Private Pool', 'Garden', 'Garage', 'Maid Room']
        },
        {
          title: 'Affordable Townhouse Demo',
          description: 'Cozy 3-bedroom townhouse perfect for families, near schools and shopping centers',
          price: 2800000,
          propertyType: 'townhouse',
          area: 120,
          rooms: { bedrooms: 3, bathrooms: 2 },
          location: {
            type: 'Point',
            coordinates: [100.5200, 13.7400],
            address: '789 Family Street, Bangkok'
          },
          features: ['Near School', 'Shopping Center', 'Public Transport']
        }
      ];

      await Property.insertMany(testProperties);
      console.log('✅ Additional test properties created');

      // Test text search
      console.log('\n🔍 Testing text search:');
      const searchResults = await Property.searchByText('luxury pool');
      console.log(`   Found ${searchResults.length} properties matching "luxury pool"`);
      if (searchResults.length > 0) {
        console.log(`   Top result: ${searchResults[0].title}`);
      }

      // Test geospatial search
      console.log('\n📍 Testing geospatial search:');
      const nearbyProperties = await Property.findNearby(100.5412, 13.7563, 5000); // 5km radius
      console.log(`   Found ${nearbyProperties.length} properties within 5km`);

      // Test compound filtering
      console.log('\n🏷️  Testing compound filtering:');
      const condosUnder5M = await Property.find({
        propertyType: 'condo',
        price: { $lte: 5000000 }
      });
      console.log(`   Found ${condosUnder5M.length} condos under ฿5M`);

      // Cleanup
      await Property.deleteMany({ title: /Demo|Test/ });
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 Property Model Demonstration Complete!');
    console.log('\nKey Features Implemented:');
    console.log('✅ Comprehensive schema validation');
    console.log('✅ Geospatial indexing (2dsphere)');
    console.log('✅ Text search indexing');
    console.log('✅ Compound indexes for performance');
    console.log('✅ Virtual properties (formatted price, price per sqm)');
    console.log('✅ Instance methods (distance calculation)');
    console.log('✅ Static methods (text search, geospatial queries)');
    console.log('✅ Pre-save middleware for data consistency');
    console.log('✅ Proper error handling and validation');

  } catch (error) {
    console.error('❌ Error during demonstration:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the demonstration
if (require.main === module) {
  demonstratePropertyModel();
}

module.exports = { demonstratePropertyModel };