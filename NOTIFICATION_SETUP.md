# Firebase Push Notification Setup Guide

## Overview
This guide explains how to set up and test the Firebase push notification system for the Golden HR application.

## Backend Setup

### 1. Environment Variables
Make sure your `.env` file contains the Firebase configuration:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=goldenhr-54cda
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
```

### 2. Start the Backend Server
```bash
npm run dev
```

The server will start with:
- API endpoints at `http://localhost:3000/api`
- Swagger documentation at `http://localhost:3000/api-docs`
- Notification scheduler running in background

## Flutter App Setup

### 1. Add Firebase Dependencies
The following dependencies are already added to `pubspec.yaml`:
```yaml
dependencies:
  firebase_core: ^3.14.0
  firebase_messaging: ^15.2.7
  flutter_local_notifications: ^19.3.0
```

### 2. Firebase Configuration Files
You need to add Firebase configuration files to your Flutter project:

#### For Android:
1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/google-services.json`

#### For iOS:
1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in `ios/Runner/GoogleService-Info.plist`

### 3. Android Configuration
Add to `android/app/build.gradle.kts`:
```kotlin
plugins {
    id("com.google.gms.google-services")
}
```

Add to `android/build.gradle.kts`:
```kotlin
buildscript {
    dependencies {
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

## API Endpoints

### Authentication Required
All notification endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Available Endpoints

#### 1. Get Notifications
```http
GET /api/notifications?page=1&limit=20&type=system&isRead=false&priority=high
```

#### 2. Mark Notification as Read
```http
PATCH /api/notifications/{notificationId}/read
```

#### 3. Mark All Notifications as Read
```http
PATCH /api/notifications/read-all
```

#### 4. Create Notification (Admin/Manager only)
```http
POST /api/notifications
Content-Type: application/json

{
  "title": "Test Notification",
  "message": "This is a test notification",
  "type": "system",
  "priority": "medium",
  "recipientIds": ["user_id_1", "user_id_2"],
  "data": {
    "customField": "customValue"
  }
}
```

#### 5. Broadcast Notification (Admin only)
```http
POST /api/notifications/broadcast
Content-Type: application/json

{
  "title": "Important Announcement",
  "message": "System maintenance tonight",
  "type": "announcement",
  "priority": "high",
  "data": {
    "maintenanceTime": "22:00-23:00"
  }
}
```

#### 6. Register FCM Token
```http
POST /api/notifications/fcm-token
Content-Type: application/json

{
  "token": "fcm_token_from_device",
  "deviceType": "android",
  "deviceId": "device_unique_id",
  "deviceInfo": {
    "model": "Samsung Galaxy S21",
    "brand": "Samsung",
    "osVersion": "11.0",
    "appVersion": "1.0.0"
  }
}
```

#### 7. Remove FCM Token
```http
DELETE /api/notifications/fcm-token
Content-Type: application/json

{
  "token": "fcm_token_to_remove"
}
```

## Testing

### 1. Test API Endpoints
```bash
# Install axios for testing
npm install axios

# Run API tests
node test-notification.js
```

### 2. Test Firebase Service
```bash
# Build the project first
npm run build

# Run Firebase tests
node test-firebase.js
```

### 3. Manual Testing with Postman
1. Import the API endpoints into Postman
2. Set up authentication by logging in first
3. Test each endpoint with sample data

## Flutter App Integration

### 1. Initialize Firebase Service
The Firebase service is automatically initialized in `main.dart`:
```dart
await FirebaseService().initialize();
```

### 2. Handle Notifications in Flutter
The app automatically:
- Requests notification permissions
- Registers FCM token with backend
- Handles foreground/background notifications
- Shows local notifications when app is in foreground
- Navigates to appropriate screens when notification is tapped

### 3. Get FCM Token for Testing
To get a real FCM token for testing:
1. Run the Flutter app on a real device
2. Check the console logs for "FCM Token: ..."
3. Use this token in your backend tests

## Notification Types

### System Notifications
- General system messages
- App updates
- Maintenance notices

### Attendance Notifications
- Check-in confirmations
- Check-out confirmations
- Late arrival warnings
- Early departure notices

### Leave Notifications
- Leave request submitted
- Leave request approved/rejected
- Leave reminders

### Announcements
- Company-wide announcements
- Policy updates
- Event notifications

### Reminders
- Meeting reminders
- Task deadlines
- Birthday notifications

## Scheduled Notifications

The system includes a scheduler that runs:
- **Every minute**: Process scheduled notifications
- **Daily at 9:00 AM**: Send daily reminders
- **Weekly on Monday at 9:00 AM**: Send weekly reports
- **Daily at 2:00 AM**: Cleanup expired notifications

## Troubleshooting

### Common Issues

1. **FCM Token Registration Fails**
   - Check if Firebase is properly initialized
   - Verify network connectivity
   - Check authentication token

2. **Notifications Not Received**
   - Verify FCM token is valid
   - Check if device has notification permissions
   - Ensure app is not in battery optimization

3. **Backend Errors**
   - Check Firebase service account credentials
   - Verify environment variables are set
   - Check server logs for detailed errors

### Debug Tips

1. **Enable Verbose Logging**
   - Check console logs in both Flutter and Node.js
   - Use Firebase Console to monitor message delivery

2. **Test with Firebase Console**
   - Send test messages directly from Firebase Console
   - Verify FCM tokens are working

3. **Check Network Connectivity**
   - Ensure devices can reach Firebase servers
   - Check firewall settings if using corporate network

## Production Considerations

1. **Security**
   - Store Firebase credentials securely
   - Validate all notification data
   - Implement rate limiting

2. **Performance**
   - Batch notification sending for large user bases
   - Use topics for broadcast messages
   - Monitor Firebase usage quotas

3. **Monitoring**
   - Set up logging for notification delivery
   - Monitor FCM token refresh rates
   - Track notification engagement metrics

## Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Verify Firebase project configuration
3. Test with minimal examples first
4. Check Firebase Console for delivery status
