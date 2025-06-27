const axios = require('axios');

async function testReject() {
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
    
    // Find a pending request
    const pendingRequests = allRequestsResponse.data.data.requests.filter(req => req.status === 'pending');
    console.log('📋 Pending requests:', pendingRequests.length);
    
    if (pendingRequests.length > 0) {
      const requestId = pendingRequests[0]._id;
      console.log(`🔍 Trying to reject request: ${requestId}`);
      
      // Try to reject the first pending request
      const rejectResponse = await axios.put(`http://192.168.1.105:3000/api/overtime/admin/${requestId}/reject`, {
        rejectionReason: 'Test rejection reason - không đủ điều kiện làm thêm giờ'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Reject successful!');
      console.log('Response:', rejectResponse.data);
    } else {
      console.log('❌ No pending requests found to reject');
      
      // Show all requests status
      allRequestsResponse.data.data.requests.forEach((req, index) => {
        console.log(`Request ${index + 1}: ${req._id} - Status: ${req.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testReject();
