# Profile API Guide

## Overview
This guide covers the Profile Management API endpoints that have been implemented for the HR system.

## API Endpoints

### 1. Get User Profile
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "fullname": "John Doe",
    "email": "john@example.com",
    "phone": "+84123456789",
    "avatar": "https://cloudinary.com/avatar.jpg",
    "department": "IT Department",
    "position": "Software Developer",
    "role": {
      "name": "user"
    }
  }
}
```

### 2. Update User Profile
**PUT** `/api/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "fullname": "Updated Name",
  "email": "newemail@example.com",
  "phone": "+84987654321",
  "department": "Marketing",
  "position": "Marketing Manager"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "fullname": "Updated Name",
    "email": "newemail@example.com",
    "phone": "+84987654321",
    "department": "Marketing",
    "position": "Marketing Manager",
    "role": {
      "name": "user"
    }
  }
}
```

### 3. Upload Avatar
**POST** `/api/auth/upload-avatar`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
avatar: <image_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://cloudinary.com/new-avatar.jpg"
  }
}
```

### 4. Change Password
**POST** `/api/auth/change-password`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "oldPassword": "current_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully."
  }
}
```

## Testing

### Prerequisites
1. Make sure the server is running on `http://localhost:3000`
2. Install axios: `npm install axios`

### Run Tests
```bash
node test_profile_api.js
```

This will test all profile-related endpoints automatically.

### Manual Testing with curl

#### 1. Register a user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "fullname": "Test User"
  }'
```

#### 2. Login to get token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

#### 3. Get profile (replace TOKEN with actual token)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

#### 4. Update profile
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Updated Name",
    "phone": "+84123456789",
    "department": "IT",
    "position": "Developer"
  }'
```

## Frontend Integration

The Flutter frontend is already configured to use these endpoints:

- `ProfileRemoteDataSource.getUserProfile()` → GET `/api/auth/me`
- `ProfileRemoteDataSource.updateUserProfile()` → PUT `/api/auth/profile`
- `ProfileRemoteDataSource.uploadProfileImage()` → POST `/api/auth/upload-avatar`
- `ProfileRemoteDataSource.changePassword()` → POST `/api/auth/change-password`

## Environment Variables

Make sure these are set in your `.env` file:

```env
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Database Schema Updates

The User model now includes:
- `phone: String` - User's phone number
- `department: String` - User's department
- `position: String` - User's position/job title

These fields are optional and will fallback to role-based defaults if not set.
