require('dotenv').config();

/**
 * System Health Check cho Notification System
 * Kiểm tra tất cả các thành phần cần thiết cho hệ thống thông báo
 */

const checkSystemHealth = async () => {
  console.log('🔍 Checking Notification System Health...\n');

  let allChecksPass = true;

  // Check 1: Environment Variables
  console.log('📋 Check 1: Environment Variables');
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'MONGODB_URI'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
    } else {
      console.log(`   ❌ ${envVar}: Missing`);
      allChecksPass = false;
    }
  }

  // Check 2: Firebase Service
  console.log('\n🔥 Check 2: Firebase Service');
  try {
    const FirebaseService = require('./dist/services/firebaseService').default;
    const firebaseService = FirebaseService.getInstance();
    console.log('   ✅ Firebase Service: Initialized successfully');
    
    // Test token validation with a dummy token
    try {
      await firebaseService.validateToken('dummy_token');
    } catch (error) {
      // Expected to fail with dummy token, but service should be working
      if (error.message.includes('not a valid FCM registration token')) {
        console.log('   ✅ Firebase Service: Token validation working (expected error with dummy token)');
      } else {
        console.log(`   ⚠️ Firebase Service: Unexpected error - ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Firebase Service: Failed to initialize - ${error.message}`);
    allChecksPass = false;
  }

  // Check 3: Notification Service
  console.log('\n📧 Check 3: Notification Service');
  try {
    const NotificationService = require('./dist/services/notificationService').default;
    const notificationService = NotificationService.getInstance();
    console.log('   ✅ Notification Service: Initialized successfully');
  } catch (error) {
    console.log(`   ❌ Notification Service: Failed to initialize - ${error.message}`);
    allChecksPass = false;
  }

  // Check 4: Database Connection
  console.log('\n🗄️ Check 4: Database Connection');
  try {
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState === 1) {
      console.log('   ✅ MongoDB: Connected');
    } else if (mongoose.connection.readyState === 2) {
      console.log('   ⏳ MongoDB: Connecting...');
    } else {
      console.log('   ❌ MongoDB: Not connected');
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ MongoDB: Error - ${error.message}`);
    allChecksPass = false;
  }

  // Check 5: Required Models
  console.log('\n📊 Check 5: Database Models');
  try {
    const Notification = require('./dist/models/notification').default;
    const FCMToken = require('./dist/models/fcmToken').default;
    const User = require('./dist/models/user').default;
    
    console.log('   ✅ Notification Model: Loaded');
    console.log('   ✅ FCMToken Model: Loaded');
    console.log('   ✅ User Model: Loaded');
  } catch (error) {
    console.log(`   ❌ Models: Error loading - ${error.message}`);
    allChecksPass = false;
  }

  // Check 6: Controllers
  console.log('\n🎮 Check 6: Controllers');
  try {
    const notificationController = require('./dist/controllers/notificationController').default;
    console.log('   ✅ Notification Controller: Loaded');
  } catch (error) {
    console.log(`   ❌ Notification Controller: Error loading - ${error.message}`);
    allChecksPass = false;
  }

  // Check 7: Routes (if server is running)
  console.log('\n🛣️ Check 7: API Routes');
  try {
    const axios = require('axios');
    
    // Try to ping the server
    const response = await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
    console.log('   ✅ Server: Running and responding');
    console.log(`   ✅ Health endpoint: ${response.status} - ${response.data.message || 'OK'}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️ Server: Not running (start with npm run dev)');
    } else {
      console.log(`   ⚠️ Server: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allChecksPass) {
    console.log('🎉 System Health Check: ALL CHECKS PASSED');
    console.log('\n✅ Your notification system is ready to use!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Run Flutter app to get FCM token');
    console.log('3. Test notifications: node quick-notification-test.js <token>');
  } else {
    console.log('❌ System Health Check: SOME CHECKS FAILED');
    console.log('\n🔧 Please fix the issues above before testing notifications');
  }
  
  console.log('\n💡 Useful commands:');
  console.log('- Check environment: node -e "console.log(process.env.FIREBASE_PROJECT_ID)"');
  console.log('- Test Firebase: node test-firebase.js');
  console.log('- Test API: node test-api-notifications.js <token>');
  console.log('- Quick test: node quick-notification-test.js <token>');
};

// Detailed system info
const showSystemInfo = () => {
  console.log('📊 System Information\n');
  
  console.log('🔧 Environment:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  
  console.log('\n📦 Package Information:');
  try {
    const packageJson = require('./package.json');
    console.log(`   App Name: ${packageJson.name}`);
    console.log(`   Version: ${packageJson.version}`);
    
    const dependencies = [
      'firebase-admin',
      'mongoose',
      'express',
      'dotenv'
    ];
    
    dependencies.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        console.log(`   ${dep}: ${packageJson.dependencies[dep]}`);
      }
    });
  } catch (error) {
    console.log('   ⚠️ Could not read package.json');
  }
  
  console.log('\n🔥 Firebase Configuration:');
  console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID || 'Not set'}`);
  console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set'}`);
  console.log(`   Private Key: ${process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set'}`);
  
  console.log('\n🗄️ Database Configuration:');
  console.log(`   MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
  
  console.log('\n');
};

// Main function
const main = async () => {
  const command = process.argv[2];
  
  if (command === '--info' || command === '-i') {
    showSystemInfo();
  } else if (command === '--help' || command === '-h') {
    console.log('🔔 Notification System Health Checker\n');
    console.log('Usage:');
    console.log('  node check-notification-system.js          # Run health check');
    console.log('  node check-notification-system.js --info   # Show system info');
    console.log('  node check-notification-system.js --help   # Show this help');
    console.log('');
  } else {
    await checkSystemHealth();
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkSystemHealth,
  showSystemInfo
};
