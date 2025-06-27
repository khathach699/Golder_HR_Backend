const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  email: 'admin@gmail.com',
  password: 'Admin123!'
};

let authToken = '';

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Error ${method} ${endpoint}:`, error.response.data);
      throw new Error(error.response.data.message || 'API Error');
    } else {
      console.error(`Error ${method} ${endpoint}:`, error.message);
      throw error;
    }
  }
};

// Test functions
const testLogin = async () => {
  console.log('🔐 Testing login...');
  try {
    const response = await makeRequest('POST', '/auth/login', TEST_USER);
    console.log('Login response:', JSON.stringify(response, null, 2));

    if (response.success && (response.token || response.data?.token)) {
      authToken = response.token || response.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
};

const testRegisterFCMToken = async () => {
  console.log('📱 Testing FCM token registration...');
  try {
    const testToken = 'test_fcm_token_' + Date.now();
    const response = await makeRequest('POST', '/notifications/fcm-token', {
      token: testToken,
      deviceType: 'android',
      deviceId: 'test_device_123',
      deviceInfo: {
        model: 'Test Device',
        brand: 'Test Brand',
        osVersion: '11.0',
        appVersion: '1.0.0'
      }
    });

    if (response.success) {
      console.log('✅ FCM token registered successfully');
      return testToken;
    } else {
      console.log('❌ FCM token registration failed');
      return null;
    }
  } catch (error) {
    console.log('❌ FCM token registration error:', error.message);
    return null;
  }
};

const testGetNotifications = async () => {
  console.log('📋 Testing get notifications...');
  try {
    const response = await makeRequest('GET', '/notifications?page=1&limit=10');
    
    if (response.success) {
      console.log('✅ Get notifications successful');
      console.log(`📊 Found ${response.data.notifications.length} notifications`);
      console.log(`🔔 Unread count: ${response.data.unreadCount}`);
      return response.data.notifications;
    } else {
      console.log('❌ Get notifications failed');
      return [];
    }
  } catch (error) {
    console.log('❌ Get notifications error:', error.message);
    return [];
  }
};

const testCreateNotification = async (recipientId) => {
  console.log('📝 Testing create notification...');
  try {
    const response = await makeRequest('POST', '/notifications', {
      title: 'Test Notification',
      message: 'This is a test notification from the API',
      type: 'system',
      priority: 'medium',
      recipientIds: [recipientId],
      data: {
        testData: 'test_value',
        timestamp: new Date().toISOString()
      }
    });

    if (response.success) {
      console.log('✅ Notification created successfully');
      return response.data._id;
    } else {
      console.log('❌ Notification creation failed');
      return null;
    }
  } catch (error) {
    console.log('❌ Notification creation error:', error.message);
    return null;
  }
};

const testMarkAsRead = async (notificationId) => {
  console.log('✅ Testing mark notification as read...');
  try {
    const response = await makeRequest('PATCH', `/notifications/${notificationId}/read`);
    
    if (response.success) {
      console.log('✅ Notification marked as read successfully');
      return true;
    } else {
      console.log('❌ Mark as read failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Mark as read error:', error.message);
    return false;
  }
};

const testBroadcastNotification = async () => {
  console.log('📢 Testing broadcast notification...');
  try {
    const response = await makeRequest('POST', '/notifications/broadcast', {
      title: 'Broadcast Test',
      message: 'This is a test broadcast notification',
      type: 'announcement',
      priority: 'high',
      data: {
        broadcastType: 'test',
        timestamp: new Date().toISOString()
      }
    });

    if (response.success) {
      console.log('✅ Broadcast notification sent successfully');
      return response.data._id;
    } else {
      console.log('❌ Broadcast notification failed');
      return null;
    }
  } catch (error) {
    console.log('❌ Broadcast notification error:', error.message);
    return null;
  }
};

const testMarkAllAsRead = async () => {
  console.log('✅ Testing mark all notifications as read...');
  try {
    const response = await makeRequest('PATCH', '/notifications/read-all');
    
    if (response.success) {
      console.log('✅ All notifications marked as read successfully');
      return true;
    } else {
      console.log('❌ Mark all as read failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Mark all as read error:', error.message);
    return false;
  }
};

const testRemoveFCMToken = async (token) => {
  console.log('🗑️ Testing FCM token removal...');
  try {
    const response = await makeRequest('DELETE', '/notifications/fcm-token', {
      token: token
    });

    if (response.success) {
      console.log('✅ FCM token removed successfully');
      return true;
    } else {
      console.log('❌ FCM token removal failed');
      return false;
    }
  } catch (error) {
    console.log('❌ FCM token removal error:', error.message);
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Notification System Tests...\n');

  // Test 1: Login
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Register FCM Token
  const fcmToken = await testRegisterFCMToken();
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Get initial notifications
  const initialNotifications = await testGetNotifications();
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Create a notification (need user ID)
  // For this test, we'll use a dummy user ID - in real scenario, get from auth response
  const testUserId = '507f1f77bcf86cd799439011'; // Example ObjectId
  const notificationId = await testCreateNotification(testUserId);
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Get notifications again to see the new one
  await testGetNotifications();
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Mark notification as read
  if (notificationId) {
    await testMarkAsRead(notificationId);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 7: Broadcast notification
  await testBroadcastNotification();
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 8: Mark all as read
  await testMarkAllAsRead();
  
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 9: Remove FCM token
  if (fcmToken) {
    await testRemoveFCMToken(fcmToken);
  }

  console.log('\n🎉 All tests completed!');
};

// Run the tests
runTests().catch(console.error);
