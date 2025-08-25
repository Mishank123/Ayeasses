// Simple Heygen API Test
import axios from 'axios';

const testHeygenConnection = async () => {
  try {
    console.log('🔍 Testing Heygen API connection...');
    
    // Get API key
    const apiKey = 'YTlhZDMwYzZmODM3NDUyMGJiYzMyMmRmNmNhYmY2MGEtMTc1NDM3NjEzMg==';
    let decodedKey = apiKey;
    try {
      if (typeof window !== 'undefined') {
        decodedKey = atob(apiKey);
      } else {
        decodedKey = Buffer.from(apiKey, 'base64').toString('utf-8');
      }
      console.log('🔑 Decoded API key:', decodedKey.substring(0, 10) + '...');
    } catch (error) {
      decodedKey = apiKey;
    }
    
    // Test basic API call
    const response = await axios.get('https://api.heygen.com/v1/avatar/list', {
      headers: {
        'Authorization': `Bearer ${decodedKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API connection successful!');
    console.log('Available avatars:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ API connection failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    return null;
  }
};

// Export for browser console use
if (typeof window !== 'undefined') {
  window.testHeygenConnection = testHeygenConnection;
}

export default testHeygenConnection;
