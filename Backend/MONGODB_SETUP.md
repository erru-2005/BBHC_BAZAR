# MongoDB Setup Guide

## 📦 MongoDB Installation

### Option 1: Local MongoDB Installation

#### Windows:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. MongoDB will run as a Windows service automatically

#### Linux (Ubuntu/Debian):
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### macOS:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Option 2: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Get your connection string
5. Update `.env` file with your Atlas connection string

## 🔧 Configuration

### Local MongoDB Connection

Update your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=bbhc_bazar
```

### MongoDB Atlas Connection

Update your `.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=bbhc_bazar
```

## ✅ Verify Connection

1. Start your Flask application:
```bash
python app.py
```

2. Check the console for:
```
Database indexes created successfully
```

3. Test the API:
```bash
curl http://localhost:5000/api/health
```

## 📊 MongoDB Collections

The application will automatically create the following collections:

- **users** - User accounts with indexes on:
  - `email` (unique)
  - `username` (unique)
  - `created_at`

## 🛠️ MongoDB Tools

### MongoDB Compass (GUI)
Download from [mongodb.com/compass](https://www.mongodb.com/products/compass) for a visual interface to manage your database.

### MongoDB Shell (mongosh)
```bash
# Connect to local MongoDB
mongosh

# Connect to specific database
mongosh bbhc_bazar

# List collections
show collections

# Query users
db.users.find().pretty()
```

## 🔍 Common Commands

```javascript
// In MongoDB shell (mongosh)

// Switch to database
use bbhc_bazar

// Find all users
db.users.find()

// Find user by email
db.users.findOne({email: "user@example.com"})

// Count documents
db.users.countDocuments()

// Create index manually (if needed)
db.users.createIndex({email: 1}, {unique: true})
```

## 🚨 Troubleshooting

### Connection Refused
- Make sure MongoDB is running: `sudo systemctl status mongod` (Linux) or check Windows Services
- Verify port 27017 is not blocked by firewall

### Authentication Error
- Check MongoDB connection string in `.env`
- For Atlas, ensure your IP is whitelisted

### Index Creation Errors
- Indexes are created automatically on app startup
- If errors occur, check MongoDB logs

