require('dotenv').config();
const FirebaseService = require('./dist/services/firebaseService').default;

// Test Firebase Service
const testFirebaseService = async () => {
  console.log('🔥 Testing Firebase Service...\n');

  try {
    // Initialize Firebase Service
    const firebaseService = FirebaseService.getInstance();
    console.log('✅ Firebase Service initialized');

    // Test 1: Send notification to a test token
    console.log('\n📱 Test 1: Send notification to device token...');
    
    // This is a dummy token - in real scenario, you'd get this from a real device
    const testToken = 'dummy_fcm_token_for_testing';
    
    try {
      await firebaseService.sendNotificationToDevice(
        testToken,
        'Test Notification',
        'This is a test notification from Firebase Service',
        {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ Notification sent to device (Note: will fail with dummy token)');
    } catch (error) {
      console.log('⚠️ Expected error with dummy token:', error.message);
    }

    // Test 2: Send notification to multiple devices
    console.log('\n📱 Test 2: Send notification to multiple devices...');
    
    const testTokens = [
      'dummy_token_1',
      'dummy_token_2',
      'dummy_token_3'
    ];
    
    try {
      await firebaseService.sendNotificationToMultipleDevices(
        testTokens,
        'Broadcast Test',
        'This is a broadcast test notification',
        {
          type: 'broadcast',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ Broadcast notification sent (Note: will fail with dummy tokens)');
    } catch (error) {
      console.log('⚠️ Expected error with dummy tokens:', error.message);
    }

    // Test 3: Send notification to topic
    console.log('\n📢 Test 3: Send notification to topic...');
    
    try {
      await firebaseService.sendNotificationToTopic(
        'test_topic',
        'Topic Notification',
        'This is a test topic notification',
        {
          type: 'topic',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ Topic notification sent');
    } catch (error) {
      console.log('❌ Topic notification error:', error.message);
    }

    // Test 4: Subscribe to topic
    console.log('\n🔔 Test 4: Subscribe tokens to topic...');
    
    try {
      await firebaseService.subscribeToTopic(testTokens, 'test_topic');
      console.log('✅ Tokens subscribed to topic (Note: will fail with dummy tokens)');
    } catch (error) {
      console.log('⚠️ Expected error with dummy tokens:', error.message);
    }

    // Test 5: Unsubscribe from topic
    console.log('\n🔕 Test 5: Unsubscribe tokens from topic...');
    
    try {
      await firebaseService.unsubscribeFromTopic(testTokens, 'test_topic');
      console.log('✅ Tokens unsubscribed from topic (Note: will fail with dummy tokens)');
    } catch (error) {
      console.log('⚠️ Expected error with dummy tokens:', error.message);
    }

    // Test 6: Validate token
    console.log('\n✅ Test 6: Validate FCM token...');
    
    try {
      const isValid = await firebaseService.validateToken(testToken);
      console.log(`Token validation result: ${isValid ? 'Valid' : 'Invalid'}`);
    } catch (error) {
      console.log('⚠️ Token validation error (expected with dummy token):', error.message);
    }

    console.log('\n🎉 Firebase Service tests completed!');
    console.log('\n📝 Notes:');
    console.log('- Most tests will show errors because we\'re using dummy tokens');
    console.log('- In a real scenario, you would use actual FCM tokens from devices');
    console.log('- To test with real tokens, register the Flutter app and get actual FCM tokens');

  } catch (error) {
    console.error('❌ Firebase Service test failed:', error);
  }
};

// Test NotificationService
const testNotificationService = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📧 Testing Notification Service...\n');

  try {
    const NotificationService = require('./dist/services/notificationService').default;
    const notificationService = NotificationService.getInstance();
    console.log('✅ Notification Service initialized');

    // Test 1: Send attendance notification
    console.log('\n⏰ Test 1: Send attendance notification...');
    
    try {
      await notificationService.sendAttendanceNotification({
        userId: '507f1f77bcf86cd799439011', // Example user ID
        type: 'check_in',
        message: 'Bạn đã chấm công vào thành công lúc 08:30 AM',
        data: {
          checkInTime: new Date().toISOString(),
          location: 'Office Building A'
        }
      });
      console.log('✅ Attendance notification sent');
    } catch (error) {
      console.log('❌ Attendance notification error:', error.message);
    }

    // Test 2: Send leave notification
    console.log('\n🏖️ Test 2: Send leave notification...');
    
    try {
      await notificationService.sendLeaveNotification({
        userId: '507f1f77bcf86cd799439011',
        managerId: '507f1f77bcf86cd799439012',
        type: 'request_approved',
        message: 'Yêu cầu nghỉ phép ngày 25/12 đã được chấp thuận',
        data: {
          leaveDate: '2024-12-25',
          leaveType: 'annual_leave'
        }
      });
      console.log('✅ Leave notification sent');
    } catch (error) {
      console.log('❌ Leave notification error:', error.message);
    }

    // Test 3: Send reminder notification
    console.log('\n⏰ Test 3: Send reminder notification...');
    
    try {
      await notificationService.sendReminderNotification({
        recipientIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        title: 'Nhắc nhở họp team',
        message: 'Cuộc họp team sẽ bắt đầu trong 15 phút',
        data: {
          meetingId: 'meeting_123',
          meetingTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
      });
      console.log('✅ Reminder notification sent');
    } catch (error) {
      console.log('❌ Reminder notification error:', error.message);
    }

    // Test 4: Broadcast notification
    console.log('\n📢 Test 4: Broadcast notification...');
    
    try {
      await notificationService.broadcastNotification({
        title: 'Thông báo quan trọng',
        message: 'Hệ thống sẽ bảo trì từ 22:00 - 23:00 hôm nay',
        type: 'announcement',
        priority: 'high',
        senderId: '507f1f77bcf86cd799439013',
        data: {
          maintenanceStart: '22:00',
          maintenanceEnd: '23:00'
        }
      });
      console.log('✅ Broadcast notification sent');
    } catch (error) {
      console.log('❌ Broadcast notification error:', error.message);
    }

    // Test 5: Schedule notification
    console.log('\n📅 Test 5: Schedule notification...');
    
    try {
      const scheduledTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      await notificationService.scheduleNotification({
        title: 'Scheduled Test',
        message: 'This is a scheduled notification',
        recipientIds: ['507f1f77bcf86cd799439011'],
        scheduledAt: scheduledTime,
        data: {
          scheduledFor: scheduledTime.toISOString()
        }
      });
      console.log('✅ Notification scheduled for:', scheduledTime.toISOString());
    } catch (error) {
      console.log('❌ Schedule notification error:', error.message);
    }

    console.log('\n🎉 Notification Service tests completed!');

  } catch (error) {
    console.error('❌ Notification Service test failed:', error);
  }
};

// Test with real FCM token
const testWithRealToken = async (realToken) => {
  console.log('\n' + '='.repeat(60));
  console.log('📱 Testing with REAL FCM Token...\n');

  if (!realToken) {
    console.log('❌ No real token provided. Please get FCM token from Flutter app first.');
    return;
  }

  try {
    const firebaseService = FirebaseService.getInstance();

    // Test 1: Send simple notification
    console.log('📤 Sending test notification to real device...');
    await firebaseService.sendNotificationToDevice(
      realToken,
      'Test từ Backend',
      'Đây là thông báo test từ Node.js backend!',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
        action: 'open_app'
      }
    );
    console.log('✅ Test notification sent successfully!');

    // Test 2: Send attendance notification
    console.log('\n⏰ Sending attendance notification...');
    const NotificationService = require('./dist/services/notificationService').default;
    const notificationService = NotificationService.getInstance();

    // Note: You need to replace this with a real user ID from your database
    const testUserId = '507f1f77bcf86cd799439011'; // Replace with real user ID

    await notificationService.sendAttendanceNotification({
      userId: testUserId,
      type: 'check_in',
      message: 'Bạn đã chấm công vào thành công lúc ' + new Date().toLocaleTimeString('vi-VN'),
      data: {
        checkInTime: new Date().toISOString(),
        location: 'Test Location'
      }
    });
    console.log('✅ Attendance notification sent!');

    // Test 3: Send high priority notification
    console.log('\n🚨 Sending high priority notification...');
    await firebaseService.sendNotificationToDevice(
      realToken,
      '🚨 Thông báo quan trọng',
      'Đây là thông báo ưu tiên cao từ hệ thống HR',
      {
        type: 'urgent',
        priority: 'high',
        timestamp: new Date().toISOString()
      }
    );
    console.log('✅ High priority notification sent!');

    console.log('\n🎉 Real device tests completed successfully!');
    console.log('📱 Check your Flutter app to see the notifications.');

  } catch (error) {
    console.error('❌ Real device test failed:', error.message);
  }
};

// Interactive test runner
const runInteractiveTest = async () => {
  console.log('🚀 Interactive Firebase Notification Test\n');

  console.log('📋 Available test options:');
  console.log('1. Test Firebase Service (with dummy tokens)');
  console.log('2. Test Notification Service (with dummy data)');
  console.log('3. Test with real FCM token');
  console.log('4. Run all tests');

  // For now, we'll run all tests. In a real scenario, you could use readline for user input
  console.log('\n🔄 Running all tests...\n');

  await testFirebaseService();
  await testNotificationService();

  console.log('\n💡 To test with real device:');
  console.log('1. Start your Flutter app');
  console.log('2. Copy the FCM token from Flutter console');
  console.log('3. Run: node test-firebase.js <your-fcm-token>');
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Firebase & Notification Service Tests...\n');

  // Check if real token is provided as command line argument
  const realToken = process.argv[2];

  if (realToken && realToken !== 'dummy_fcm_token_for_testing') {
    console.log('🎯 Real FCM token detected, running real device tests...');
    await testWithRealToken(realToken);
  } else {
    console.log('🧪 No real token provided, running dummy tests...');
    await runInteractiveTest();
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 All tests completed!');
  console.log('\n💡 Usage examples:');
  console.log('- Test with dummy data: node test-firebase.js');
  console.log('- Test with real token: node test-firebase.js <your-fcm-token>');
  console.log('\n📱 To get real FCM token from Flutter:');
  console.log('1. Run Flutter app in debug mode');
  console.log('2. Check console for "FCM Token: ..." message');
  console.log('3. Copy the token and use it in the command above');
};

// Check if this script is run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testFirebaseService,
  testNotificationService,
  runAllTests
};
