require('dotenv').config();

/**
 * Quick Notification Test Script
 * Sử dụng để test nhanh thông báo với FCM token thật
 */

const testQuickNotification = async (fcmToken) => {
  if (!fcmToken) {
    console.log('❌ Vui lòng cung cấp FCM token');
    console.log('📱 Cách lấy FCM token từ Flutter app:');
    console.log('1. Mở Flutter app trong debug mode');
    console.log('2. Tìm dòng "FCM Token: ..." trong console');
    console.log('3. Copy token và chạy: node quick-notification-test.js <token>');
    return;
  }

  console.log('🚀 Bắt đầu test thông báo...\n');

  try {
    // Import Firebase Service
    const FirebaseService = require('./dist/services/firebaseService').default;
    const firebaseService = FirebaseService.getInstance();
    console.log('✅ Firebase Service đã khởi tạo');

    // Test 1: Thông báo đơn giản
    console.log('\n📤 Test 1: Gửi thông báo đơn giản...');
    await firebaseService.sendNotificationToDevice(
      fcmToken,
      '🎉 Test Thành Công!',
      'Thông báo từ Node.js backend đã hoạt động!',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );
    console.log('✅ Thông báo đơn giản đã gửi');

    // Đợi 2 giây
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Thông báo chấm công
    console.log('\n⏰ Test 2: Gửi thông báo chấm công...');
    await firebaseService.sendNotificationToDevice(
      fcmToken,
      '⏰ Chấm Công',
      `Bạn đã chấm công thành công lúc ${new Date().toLocaleTimeString('vi-VN')}`,
      {
        type: 'attendance',
        action: 'check_in',
        timestamp: new Date().toISOString(),
        location: 'Văn phòng chính'
      }
    );
    console.log('✅ Thông báo chấm công đã gửi');

    // Đợi 2 giây
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Thông báo ưu tiên cao
    console.log('\n🚨 Test 3: Gửi thông báo ưu tiên cao...');
    await firebaseService.sendNotificationToDevice(
      fcmToken,
      '🚨 Thông Báo Quan Trọng',
      'Hệ thống sẽ bảo trì từ 22:00 - 23:00 hôm nay',
      {
        type: 'announcement',
        priority: 'high',
        timestamp: new Date().toISOString(),
        maintenanceTime: '22:00 - 23:00'
      }
    );
    console.log('✅ Thông báo ưu tiên cao đã gửi');

    console.log('\n🎉 Tất cả test đã hoàn thành!');
    console.log('📱 Kiểm tra điện thoại để xem thông báo');

  } catch (error) {
    console.error('❌ Lỗi khi test:', error.message);
    
    if (error.message.includes('not a valid FCM registration token')) {
      console.log('\n💡 Lỗi token không hợp lệ:');
      console.log('- Đảm bảo Flutter app đang chạy');
      console.log('- Copy đúng FCM token từ console');
      console.log('- Token phải là chuỗi dài khoảng 150+ ký tự');
    }
  }
};

// Test với Notification Service
const testNotificationService = async (fcmToken, userId = '507f1f77bcf86cd799439011') => {
  console.log('\n' + '='.repeat(50));
  console.log('📧 Test Notification Service...\n');

  try {
    const NotificationService = require('./dist/services/notificationService').default;
    const notificationService = NotificationService.getInstance();

    // Test attendance notification
    console.log('⏰ Gửi thông báo chấm công qua Notification Service...');
    await notificationService.sendAttendanceNotification({
      userId: userId,
      type: 'check_in',
      message: `Chấm công vào thành công lúc ${new Date().toLocaleTimeString('vi-VN')}`,
      data: {
        checkInTime: new Date().toISOString(),
        location: 'Test Location',
        department: 'IT Department'
      }
    });
    console.log('✅ Thông báo chấm công (Notification Service) đã gửi');

    // Đợi 2 giây
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test reminder notification
    console.log('\n⏰ Gửi thông báo nhắc nhở...');
    await notificationService.sendReminderNotification({
      recipientIds: [userId],
      title: 'Nhắc Nhở Họp',
      message: 'Cuộc họp team sẽ bắt đầu trong 15 phút',
      data: {
        meetingId: 'meeting_123',
        meetingTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        location: 'Phòng họp A'
      }
    });
    console.log('✅ Thông báo nhắc nhở đã gửi');

    console.log('\n🎉 Notification Service test hoàn thành!');

  } catch (error) {
    console.error('❌ Lỗi Notification Service:', error.message);
  }
};

// Main function
const main = async () => {
  const fcmToken = process.argv[2];
  const userId = process.argv[3]; // Optional user ID

  console.log('🔥 Quick Firebase Notification Test\n');

  if (!fcmToken) {
    console.log('❌ Thiếu FCM token!');
    console.log('\n📋 Cách sử dụng:');
    console.log('node quick-notification-test.js <FCM_TOKEN> [USER_ID]');
    console.log('\n📱 Cách lấy FCM token:');
    console.log('1. Mở Flutter app');
    console.log('2. Xem console log tìm "FCM Token: ..."');
    console.log('3. Copy token và chạy lại script');
    console.log('\n💡 Ví dụ:');
    console.log('node quick-notification-test.js dA1B2c3D4e5F6g7H8i9J0k...');
    return;
  }

  console.log(`📱 FCM Token: ${fcmToken.substring(0, 20)}...`);
  if (userId) {
    console.log(`👤 User ID: ${userId}`);
  }
  console.log('');

  // Run Firebase Service tests
  await testQuickNotification(fcmToken);

  // Run Notification Service tests
  await testNotificationService(fcmToken, userId);

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Tất cả test đã hoàn thành!');
  console.log('\n💡 Lưu ý:');
  console.log('- Kiểm tra điện thoại để xem thông báo');
  console.log('- Thông báo có thể mất vài giây để hiển thị');
  console.log('- Đảm bảo app Flutter đang chạy hoặc ở background');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testQuickNotification,
  testNotificationService
};
