const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Document = require('./models/Document');
const SOSAlert = require('./models/SOSAlert');

async function clearUserData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count existing records before deletion
    const userCount = await User.countDocuments();
    const documentCount = await Document.countDocuments();
    const sosAlertCount = await SOSAlert.countDocuments();

    console.log('\n📊 Current Data Count:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Documents: ${documentCount}`);
    console.log(`   SOS Alerts: ${sosAlertCount}`);

    if (userCount === 0 && documentCount === 0 && sosAlertCount === 0) {
      console.log('\n✅ No user data found to clear.');
      return;
    }

    console.log('\n🗑️  Starting data cleanup...');

    // Delete SOS Alerts first (they reference users)
    console.log('   Deleting SOS alerts...');
    const sosDeleteResult = await SOSAlert.deleteMany({});
    console.log(`   ✅ Deleted ${sosDeleteResult.deletedCount} SOS alerts`);

    // Delete Documents (they reference users and have uploaded files)
    console.log('   Deleting documents...');
    const documents = await Document.find({});
    
    // Delete associated files
    for (const doc of documents) {
      try {
        const filePath = path.join(__dirname, doc.filePath);
        await fs.unlink(filePath);
        console.log(`   📄 Deleted file: ${doc.fileName}`);
      } catch (error) {
        console.log(`   ⚠️  Could not delete file ${doc.fileName}: ${error.message}`);
      }
    }

    const docDeleteResult = await Document.deleteMany({});
    console.log(`   ✅ Deleted ${docDeleteResult.deletedCount} documents`);

    // Delete Users last
    console.log('   Deleting users...');
    const userDeleteResult = await User.deleteMany({});
    console.log(`   ✅ Deleted ${userDeleteResult.deletedCount} users`);

    // Clean up empty upload directories
    try {
      const uploadsDir = path.join(__dirname, 'public', 'uploads');
      const files = await fs.readdir(uploadsDir);
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          await fs.unlink(filePath);
          console.log(`   🗑️  Cleaned up orphaned file: ${file}`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not clean uploads directory: ${error.message}`);
    }

    console.log('\n🎉 User data cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${userDeleteResult.deletedCount} users removed`);
    console.log(`   • ${docDeleteResult.deletedCount} documents removed`);
    console.log(`   • ${sosDeleteResult.deletedCount} SOS alerts removed`);
    console.log(`   • Associated files cleaned up`);

  } catch (error) {
    console.error('❌ Error clearing user data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
if (require.main === module) {
  console.log('🚨 USER DATA CLEANUP SCRIPT');
  console.log('⚠️  This will permanently delete ALL user data!');
  console.log('   - All user accounts');
  console.log('   - All uploaded documents');
  console.log('   - All SOS alert records');
  console.log('   - All uploaded files');
  console.log('\n⏳ Starting in 3 seconds...\n');
  
  setTimeout(() => {
    clearUserData();
  }, 3000);
}

module.exports = clearUserData;
