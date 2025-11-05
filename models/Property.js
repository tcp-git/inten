const mongoose = require('mongoose');

// Property schema definition
const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Property description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  price: {
    type: Number,
    required: [true, 'Property price is required'],
    min: [0, 'Price must be a positive number'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value >= 0;
      },
      message: 'Price must be a positive integer'
    }
  },
  
  propertyType: {
    type: String,
    required: [true, 'Property type is required'],
    enum: {
      values: ['house', 'condo', 'townhouse', 'land'],
      message: 'Property type must be one of: house, condo, townhouse, land'
    },
    index: true
  },
  
  area: {
    type: Number,
    required: [true, 'Property area is required'],
    min: [1, 'Area must be at least 1 square meter'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Area must be a positive number'
    }
  },
  
  rooms: {
    bedrooms: {
      type: Number,
      min: [0, 'Number of bedrooms cannot be negative'],
      default: 0,
      validate: {
        validator: function(value) {
          return Number.isInteger(value) && value >= 0;
        },
        message: 'Number of bedrooms must be a non-negative integer'
      }
    },
    bathrooms: {
      type: Number,
      min: [0, 'Number of bathrooms cannot be negative'],
      default: 0,
      validate: {
        validator: function(value) {
          return value >= 0;
        },
        message: 'Number of bathrooms must be a non-negative number'
      }
    }
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: [true, 'Location type is required']
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location coordinates are required'],
      validate: {
        validator: function(coordinates) {
          return Array.isArray(coordinates) && 
                 coordinates.length === 2 && 
                 coordinates.every(coord => typeof coord === 'number' && !isNaN(coord)) &&
                 coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
                 coordinates[1] >= -90 && coordinates[1] <= 90;     // latitude
        },
        message: 'Coordinates must be an array of [longitude, latitude] with valid ranges'
      }
    },
    address: {
      type: String,
      required: [true, 'Property address is required'],
      trim: true,
      minlength: [10, 'Address must be at least 10 characters long'],
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    district: {
      type: String,
      trim: true,
      maxlength: [100, 'District name cannot exceed 100 characters']
    },
    province: {
      type: String,
      trim: true,
      maxlength: [100, 'Province name cannot exceed 100 characters']
    }
  },
  
  features: {
    type: [String],
    default: [],
    validate: {
      validator: function(features) {
        return features.every(feature => 
          typeof feature === 'string' && 
          feature.trim().length > 0 && 
          feature.length <= 100
        );
      },
      message: 'Each feature must be a non-empty string with maximum 100 characters'
    }
  },
  
  // Semantic embedding vector for AI-powered search
  embedding: {
    type: [Number],
    default: [],
    validate: {
      validator: function(embedding) {
        // Allow empty array (will be populated by AI service)
        if (embedding.length === 0) return true;
        // If not empty, should be array of numbers with consistent length
        return embedding.every(val => typeof val === 'number' && !isNaN(val));
      },
      message: 'Embedding must be an array of numbers'
    }
  },
  
  // Additional metadata
  status: {
    type: String,
    enum: {
      values: ['available', 'sold', 'rented', 'pending'],
      message: 'Status must be one of: available, sold, rented, pending'
    },
    default: 'available',
    index: true
  },
  
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(images) {
        return images.every(image => 
          typeof image === 'string' && 
          image.trim().length > 0
        );
      },
      message: 'Each image must be a valid string URL'
    }
  },
  
  contact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(phone) {
          if (!phone) return true; // Optional field
          // Basic phone validation (Thai format)
          return /^(\+66|0)[0-9]{8,9}$/.test(phone.replace(/[-\s]/g, ''));
        },
        message: 'Please provide a valid Thai phone number'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(email) {
          if (!email) return true; // Optional field
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address'
      }
    }
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization

// Geospatial index for location-based queries (2dsphere for Earth-like sphere)
propertySchema.index({ 'location': '2dsphere' });

// Text index for full-text search on title and description
propertySchema.index({ 
  title: 'text', 
  description: 'text',
  'location.address': 'text',
  features: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    'location.address': 3,
    features: 1
  },
  name: 'property_text_index'
});

// Compound indexes for common query patterns
propertySchema.index({ price: 1, propertyType: 1 }); // Price range + type filtering
propertySchema.index({ propertyType: 1, area: 1 }); // Type + area filtering
propertySchema.index({ status: 1, createdAt: -1 }); // Status + recent first
propertySchema.index({ 'rooms.bedrooms': 1, 'rooms.bathrooms': 1 }); // Room filtering

// Performance index for pagination
propertySchema.index({ createdAt: -1 }); // Recent properties first
propertySchema.index({ price: 1 }); // Price sorting
propertySchema.index({ area: -1 }); // Area sorting (largest first)

// Virtual for formatted price
propertySchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(this.price);
});

// Virtual for price per square meter
propertySchema.virtual('pricePerSqm').get(function() {
  return Math.round(this.price / this.area);
});

// Instance method to calculate distance from a point
propertySchema.methods.calculateDistance = function(longitude, latitude) {
  const [propLng, propLat] = this.location.coordinates;
  
  // Haversine formula for calculating distance between two points on Earth
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - propLat) * Math.PI / 180;
  const dLng = (longitude - propLng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(propLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Static method for geospatial queries
propertySchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  });
};

// Static method for text search
propertySchema.statics.searchByText = function(searchText, options = {}) {
  const query = {
    $text: { $search: searchText }
  };
  
  // Add additional filters if provided
  if (options.priceMin !== undefined) query.price = { $gte: options.priceMin };
  if (options.priceMax !== undefined) {
    query.price = query.price || {};
    query.price.$lte = options.priceMax;
  }
  if (options.propertyType) query.propertyType = options.propertyType;
  if (options.status) query.status = options.status;
  
  return this.find(query, { score: { $meta: 'textScore' } })
             .sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware to ensure data consistency
propertySchema.pre('save', function(next) {
  // Ensure coordinates are in correct order [longitude, latitude]
  if (this.location && this.location.coordinates) {
    const [lng, lat] = this.location.coordinates;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      return next(new Error('Invalid coordinates: longitude must be between -180 and 180, latitude between -90 and 90'));
    }
  }
  
  // Trim and clean features array
  if (this.features && Array.isArray(this.features)) {
    this.features = this.features
      .map(feature => feature.trim())
      .filter(feature => feature.length > 0)
      .filter((feature, index, arr) => arr.indexOf(feature) === index); // Remove duplicates
  }
  
  next();
});

// Create the model
const Property = mongoose.model('Property', propertySchema);

module.exports = Property;