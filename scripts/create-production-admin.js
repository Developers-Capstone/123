// Script to add admin account to production MongoDB database
const mongoose = require('mongoose');
require('dotenv').config();

// Import Admin model
const Admin = require('../models/Admin');

async function addAdminToProductionDatabase() {
  try {
    // Use MONGO_URI for production or fallback to local
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tourist-safety';
    
    console.log('🔄 Connecting to production database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to production database');

    // Delete existing admin if exists
    await Admin.deleteMany({ username: 'admin' });
    console.log('🗑️ Cleared existing admin accounts');

    // Create admin (password will be hashed by pre-save middleware)
    const admin = new Admin({
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Production admin account created successfully!');
    console.log('📋 Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('🌐 Production admin ready!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating production admin:', error);
    console.error('💡 Make sure MONGO_URI is set correctly');
    process.exit(1);
  }
}

addAdminToProductionDatabase();
