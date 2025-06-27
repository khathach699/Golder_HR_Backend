require('dotenv').config();
const axios = require('axios');

/**
 * Test API Endpoints cho Notification System
 * Script này test các API endpoints thông qua HTTP requests
 */

const BASE_URL = 'http://localhost:3000/api';
const FCM_TOKEN = process.argv[2]; // FCM token từ command line

// Test data
const TEST_USER_ID = '507f1f77bcf86cd799439011';
const TEST_MANAGER_ID = '507f1f77bcf86cd799439012';

const testAPIEndpoints = async () => {
  if (!FCM_TOKEN) {
    console.log('❌ Vui lòng cung cấp FCM token');
    console.log('📋 Cách sử dụng: node test-api-notifications.js <FCM_TOKEN>');
    return;
  }

  console.log('🚀 Testing Notification API Endpoints...\n');
  console.log(`📱 FCM Token: ${FCM_TOKEN.substring(0, 20)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Register FCM Token
    console.log('📝 Test 1: Register FCM Token...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/notifications/register-token`, {
        userId: TEST_USER_ID,
        token: FCM_TOKEN,
        deviceType: 'android',
        deviceInfo: {
          model: 'Test Device',
          brand: 'Test Brand',
          osVersion: '13.0',
          appVersion: '1.0.0'
        }
      });
      console.log('✅ FCM Token registered successfully');
      console.log(`   Response: ${registerResponse.data.message}`);
    } catch (error) {
      console.log('⚠️ Register token error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 2: Send Attendance Notification
    console.log('\n⏰ Test 2: Send Attendance Notification...');
    try {
      const attendanceResponse = await axios.post(`${BASE_URL}/notifications/attendance`, {
        userId: TEST_USER_ID,
        type: 'check_in',
        message: `Test chấm công vào lúc ${new Date().toLocaleTimeString('vi-VN')}`
      });
      console.log('✅ Attendance notification sent');
      console.log(`   Response: ${attendanceResponse.data.message}`);
    } catch (error) {
      console.log('❌ Attendance notification error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 3: Send Leave Notification
    console.log('\n🏖️ Test 3: Send Leave Notification...');
    try {
      const leaveResponse = await axios.post(`${BASE_URL}/notifications/leave`, {
        userId: TEST_USER_ID,
        managerId: TEST_MANAGER_ID,
        type: 'request_submitted',
        message: 'Yêu cầu nghỉ phép đã được gửi và đang chờ phê duyệt'
      });
      console.log('✅ Leave notification sent');
      console.log(`   Response: ${leaveResponse.data.message}`);
    } catch (error) {
      console.log('❌ Leave notification error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 4: Send Reminder Notification
    console.log('\n⏰ Test 4: Send Reminder Notification...');
    try {
      const reminderResponse = await axios.post(`${BASE_URL}/notifications/reminder`, {
        recipientIds: [TEST_USER_ID],
        title: 'Nhắc nhở họp team',
        message: 'Cuộc họp team sẽ bắt đầu trong 15 phút tại phòng họp A'
      });
      console.log('✅ Reminder notification sent');
      console.log(`   Response: ${reminderResponse.data.message}`);
    } catch (error) {
      console.log('❌ Reminder notification error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 5: Broadcast Notification
    console.log('\n📢 Test 5: Broadcast Notification...');
    try {
      const broadcastResponse = await axios.post(`${BASE_URL}/notifications/broadcast`, {
        title: 'Thông báo quan trọng',
        message: 'Hệ thống sẽ bảo trì từ 22:00 - 23:00 hôm nay',
        type: 'announcement',
        priority: 'high'
      });
      console.log('✅ Broadcast notification sent');
      console.log(`   Response: ${broadcastResponse.data.message}`);
    } catch (error) {
      console.log('❌ Broadcast notification error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 6: Subscribe to Topic
    console.log('\n🔔 Test 6: Subscribe to Topic...');
    try {
      const subscribeResponse = await axios.post(`${BASE_URL}/notifications/subscribe-topic`, {
        tokens: [FCM_TOKEN],
        topic: 'test_topic'
      });
      console.log('✅ Subscribed to topic');
      console.log(`   Response: ${subscribeResponse.data.message}`);
    } catch (error) {
      console.log('❌ Subscribe to topic error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 7: Send Topic Notification
    console.log('\n📢 Test 7: Send Topic Notification...');
    try {
      const topicResponse = await axios.post(`${BASE_URL}/notifications/topic`, {
        topic: 'test_topic',
        title: 'Topic Notification',
        message: 'Đây là thông báo gửi đến topic test_topic'
      });
      console.log('✅ Topic notification sent');
      console.log(`   Response: ${topicResponse.data.message}`);
    } catch (error) {
      console.log('❌ Topic notification error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 8: Get User Notifications
    console.log('\n📋 Test 8: Get User Notifications...');
    try {
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications/user/${TEST_USER_ID}?page=1&limit=5`);
      console.log('✅ User notifications retrieved');
      console.log(`   Found ${notificationsResponse.data.data.notifications.length} notifications`);
      
      if (notificationsResponse.data.data.notifications.length > 0) {
        const firstNotification = notificationsResponse.data.data.notifications[0];
        console.log(`   Latest: "${firstNotification.title}" - ${firstNotification.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Get notifications error:', error.response?.data?.message || error.message);
    }

    await delay(2000);

    // Test 9: Mark Notification as Read
    console.log('\n✅ Test 9: Mark Notification as Read...');
    try {
      // First get a notification ID
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications/user/${TEST_USER_ID}?page=1&limit=1`);
      
      if (notificationsResponse.data.data.notifications.length > 0) {
        const notificationId = notificationsResponse.data.data.notifications[0]._id;
        
        const markReadResponse = await axios.patch(`${BASE_URL}/notifications/${notificationId}/read`, {
          userId: TEST_USER_ID
        });
        console.log('✅ Notification marked as read');
        console.log(`   Response: ${markReadResponse.data.message}`);
      } else {
        console.log('⚠️ No notifications found to mark as read');
      }
    } catch (error) {
      console.log('❌ Mark as read error:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 All API tests completed!');
    console.log('\n📱 Check your phone for notifications');
    console.log('💡 You can also check the database to see stored notifications');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

// Test với Direct Firebase Service (không qua API)
const testDirectFirebase = async () => {
  console.log('\n' + '='.repeat(50));
  console.log('🔥 Testing Direct Firebase Service...\n');

  try {
    const FirebaseService = require('./dist/services/firebaseService').default;
    const firebaseService = FirebaseService.getInstance();

    // Test direct notification
    await firebaseService.sendNotificationToDevice(
      FCM_TOKEN,
      '🔥 Direct Firebase Test',
      'Thông báo trực tiếp từ Firebase Service (không qua API)',
      {
        type: 'direct_test',
        timestamp: new Date().toISOString()
      }
    );
    console.log('✅ Direct Firebase notification sent');

  } catch (error) {
    console.log('❌ Direct Firebase test error:', error.message);
  }
};

// Helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function
const main = async () => {
  console.log('🔔 Notification API Testing Tool\n');

  if (!FCM_TOKEN) {
    console.log('❌ Missing FCM Token!');
    console.log('\n📋 Usage:');
    console.log('node test-api-notifications.js <FCM_TOKEN>');
    console.log('\n📱 How to get FCM Token:');
    console.log('1. Run Flutter app in debug mode');
    console.log('2. Look for "FCM Token: ..." in console');
    console.log('3. Copy the token and run this script');
    console.log('\n💡 Example:');
    console.log('node test-api-notifications.js dA1B2c3D4e5F6g7H8i9J0k...');
    return;
  }

  // Test API endpoints
  await testAPIEndpoints();

  // Test direct Firebase service
  await testDirectFirebase();

  console.log('\n' + '='.repeat(50));
  console.log('🏁 All tests completed!');
  console.log('\n📊 Summary:');
  console.log('- API endpoints tested via HTTP requests');
  console.log('- Direct Firebase service tested');
  console.log('- Check your phone for notifications');
  console.log('- Check backend console for logs');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testAPIEndpoints,
  testDirectFirebase
};
