const axios = require('axios');

async function testApprove() {
  try {
    // Login first to get fresh token
    console.log('🔍 Logging in as admin...');
    const loginResponse = await axios.post('http://192.168.1.105:3000/api/auth/login', {
      email: 'admin@test.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token');
    
    // Get all requests first
    console.log('🔍 Getting all overtime requests...');
    const allRequestsResponse = await axios.get('http://192.168.1.105:3000/api/overtime/admin/all?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Got requests:', allRequestsResponse.data.data.requests.length);
    
    if (allRequestsResponse.data.data.requests.length > 0) {
      const requestId = allRequestsResponse.data.data.requests[0]._id;
      console.log(`🔍 Trying to approve request: ${requestId}`);
      
      // Try to approve the first request
      const approveResponse = await axios.put(`http://192.168.1.105:3000/api/overtime/admin/${requestId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Approve successful!');
      console.log('Response:', approveResponse.data);
    } else {
      console.log('❌ No requests found to approve');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testApprove();
