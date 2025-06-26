// Test script for Profile API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'Test123456',
  fullname: 'Test User'
};

let authToken = '';

async function testRegister() {
  try {
    console.log('🔄 Testing user registration...');
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✅ Registration successful:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('🔄 Testing user login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = response.data.data.token;
    console.log('✅ Login successful, token received');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetProfile() {
  try {
    console.log('🔄 Testing get user profile...');
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Get profile successful:', response.data);
    return response.data.data;
  } catch (error) {
    console.log('❌ Get profile failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateProfile() {
  try {
    console.log('🔄 Testing update user profile...');
    const updateData = {
      fullname: 'Updated Test User',
      phone: '+84123456789',
      department: 'IT Department',
      position: 'Software Developer'
    };
    
    const response = await axios.put(`${BASE_URL}/auth/profile`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Update profile successful:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Update profile failed:', error.response?.data || error.message);
    return false;
  }
}

async function testChangePassword() {
  try {
    console.log('🔄 Testing change password...');
    const response = await axios.post(`${BASE_URL}/auth/change-password`, {
      oldPassword: testUser.password,
      newPassword: 'NewPassword123'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Change password successful:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Change password failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Profile API Tests...\n');
  
  // Test registration
  await testRegister();
  console.log('');
  
  // Test login
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('❌ Cannot continue tests without authentication');
    return;
  }
  console.log('');
  
  // Test get profile
  await testGetProfile();
  console.log('');
  
  // Test update profile
  await testUpdateProfile();
  console.log('');
  
  // Test get profile again to see changes
  console.log('🔄 Getting profile again to verify updates...');
  await testGetProfile();
  console.log('');
  
  // Test change password
  await testChangePassword();
  console.log('');
  
  console.log('🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error);
