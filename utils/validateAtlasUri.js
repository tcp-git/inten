/**
 * Validates and provides feedback on MongoDB Atlas connection strings
 */

function validateAtlasUri(uri) {
  const issues = [];
  const suggestions = [];
  
  if (!uri) {
    issues.push('Connection string is empty or undefined');
    suggestions.push('Set MONGODB_ATLAS_URI in your .env file');
    return { isValid: false, issues, suggestions };
  }
  
  // Check if it's an Atlas URI
  if (!uri.startsWith('mongodb+srv://')) {
    issues.push('Not a MongoDB Atlas connection string');
    suggestions.push('Atlas URIs should start with mongodb+srv://');
  }
  
  // Check basic structure
  const atlasPattern = /^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)(\?.*)?$/;
  const match = uri.match(atlasPattern);
  
  if (!match) {
    issues.push('Invalid connection string format');
    suggestions.push('Format should be: mongodb+srv://username:password@cluster.mongodb.net/database?options');
    return { isValid: false, issues, suggestions };
  }
  
  const [, username, password, cluster, database, queryString] = match;
  
  // Validate components
  if (username === 'your-username' || username === '<username>') {
    issues.push('Username is still a placeholder');
    suggestions.push('Replace "your-username" with your actual MongoDB Atlas username');
  }
  
  if (password === 'your-password' || password === '<password>') {
    issues.push('Password is still a placeholder');
    suggestions.push('Replace "your-password" with your actual MongoDB Atlas password');
  }
  
  if (cluster.includes('your-cluster') || cluster.includes('<cluster>')) {
    issues.push('Cluster name is still a placeholder');
    suggestions.push('Replace with your actual cluster name from MongoDB Atlas');
  }
  
  if (!cluster.includes('.mongodb.net')) {
    issues.push('Cluster domain doesn\'t look like a MongoDB Atlas cluster');
    suggestions.push('Atlas clusters typically end with .mongodb.net');
  }
  
  if (database === 'test' || database === '<database>') {
    suggestions.push('Consider using a more descriptive database name than "test"');
  }
  
  // Check for required query parameters
  if (queryString) {
    if (!queryString.includes('retryWrites=true')) {
      suggestions.push('Consider adding retryWrites=true for better reliability');
    }
    if (!queryString.includes('w=majority')) {
      suggestions.push('Consider adding w=majority for write concern');
    }
  } else {
    suggestions.push('Consider adding query parameters: ?retryWrites=true&w=majority');
  }
  
  // Check for special characters that might need encoding
  const needsEncoding = /[^a-zA-Z0-9\-._~]/.test(password);
  if (needsEncoding) {
    suggestions.push('Password contains special characters - make sure they are URL encoded');
    suggestions.push('Common encodings: @ → %40, : → %3A, / → %2F, ? → %3F, # → %23');
  }
  
  const isValid = issues.length === 0;
  
  return {
    isValid,
    issues,
    suggestions,
    components: {
      username,
      cluster,
      database,
      hasQueryParams: !!queryString,
    },
  };
}

function generateSampleUri(clusterName = 'your-cluster', database = 'ai-property-search') {
  return `mongodb+srv://your-username:your-password@${clusterName}.mongodb.net/${database}?retryWrites=true&w=majority`;
}

// CLI usage
if (require.main === module) {
  const uri = process.env.MONGODB_ATLAS_URI;
  
  console.log('🔍 MongoDB Atlas URI Validator\n');
  
  if (!uri) {
    console.log('❌ No MONGODB_ATLAS_URI found in environment variables');
    console.log('\n💡 Add this to your .env file:');
    console.log(`MONGODB_ATLAS_URI=${generateSampleUri()}`);
    console.log('\n📖 Then replace the placeholder values with your actual Atlas credentials');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
  
  console.log('🔗 Checking URI:', uri.replace(/:([^@]+)@/, ':***@')); // Hide password
  
  const validation = validateAtlasUri(uri);
  
  if (validation.isValid) {
    console.log('\n✅ Connection string looks valid!');
    console.log(`📍 Username: ${validation.components.username}`);
    console.log(`📍 Cluster: ${validation.components.cluster}`);
    console.log(`📍 Database: ${validation.components.database}`);
  } else {
    console.log('\n❌ Issues found:');
    validation.issues.forEach(issue => console.log(`  • ${issue}`));
  }
  
  if (validation.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    validation.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
  }
  
  console.log('\n🧪 Run "npm run test:atlas" to test the connection');
}

module.exports = { validateAtlasUri, generateSampleUri };