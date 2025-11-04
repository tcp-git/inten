# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for the AI Property Search Backend.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account or log in to your existing account
3. Create a new project (e.g., "AI Property Search")

## Step 2: Create a Cluster

1. Click "Build a Database" or "Create Cluster"
2. Choose the **FREE** tier (M0 Sandbox)
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "ai-property-search-cluster")
5. Click "Create Cluster"

## Step 3: Configure Database Access

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Create a username and strong password
5. Set database user privileges to "Read and write to any database"
6. Click "Add User"

**Important:** Save your username and password - you'll need them for the connection string!

## Step 4: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production, add only your specific IP addresses
5. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" as the driver and version 4.1 or later
5. Copy the connection string

The connection string will look like:
```
mongodb+srv://<username>:<password>@your-cluster.mongodb.net/<database-name>?retryWrites=true&w=majority
```

## Step 6: Update Environment Variables

1. Open your `.env` file
2. Replace the `MONGODB_ATLAS_URI` with your connection string:

```env
MONGODB_ATLAS_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/ai-property-search?retryWrites=true&w=majority
```

**Replace:**
- `your-username` with your database username
- `your-password` with your database password
- `your-cluster` with your actual cluster name
- `ai-property-search` with your preferred database name

## Step 7: Test Connection

Run the database test to verify your connection:

```bash
npm run test:db
```

Or start the server and check the health endpoint:

```bash
npm start
# In another terminal:
curl http://localhost:3000/health
```

## Common Issues and Solutions

### Authentication Failed
- Double-check your username and password
- Make sure there are no special characters that need URL encoding
- Verify the user has proper permissions

### Network Timeout / Connection Refused
- Check your network access settings in Atlas
- Ensure your IP address is whitelisted
- Try allowing access from anywhere (0.0.0.0/0) for testing

### Database Not Found
- The database will be created automatically when you first write data
- Make sure the database name in your connection string is correct

### URL Encoding for Special Characters
If your password contains special characters, you need to URL encode them:
- `@` becomes `%40`
- `:` becomes `%3A`
- `/` becomes `%2F`
- `?` becomes `%3F`
- `#` becomes `%23`
- `[` becomes `%5B`
- `]` becomes `%5D`

## Security Best Practices

1. **Never commit credentials to version control**
2. Use environment variables for sensitive data
3. Rotate passwords regularly
4. Use specific IP whitelisting in production
5. Enable MongoDB Atlas monitoring and alerts
6. Use database-specific users with minimal required permissions

## Monitoring and Maintenance

1. Monitor your cluster usage in the Atlas dashboard
2. Set up alerts for connection issues
3. Regularly review access logs
4. Keep your connection drivers updated

## Free Tier Limitations

MongoDB Atlas free tier (M0) includes:
- 512 MB storage
- Shared RAM and vCPU
- No backup/restore
- Limited to 100 connections

For production applications, consider upgrading to a dedicated cluster.