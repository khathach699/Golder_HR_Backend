const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login...');
    
    const response = await axios.post('http://192.168.1.105:3000/api/auth/login', {
      email: 'admin@test.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', response.data.data.token);
    console.log('User:', response.data.data.user);
    
    // Test debug endpoint with new token
    const debugResponse = await axios.get('http://192.168.1.105:3000/api/overtime/admin/debug', {
      headers: {
        'Authorization': `Bearer ${response.data.data.token}`
      }
    });
    
    console.log('✅ Debug endpoint successful!');
    console.log('Debug data:', debugResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminLogin();
