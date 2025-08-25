// Test Heygen API Integration
import axios from 'axios';
import HEYGEN_CONFIG from '../config/heygen';

// Create axios instance for testing
const testAPI = axios.create({
  baseURL: HEYGEN_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add API key to requests
testAPI.interceptors.request.use((config) => {
  const apiKey = HEYGEN_CONFIG.getApiKey();
  if (apiKey) {
    let decodedKey = apiKey;
    try {
      if (typeof window !== 'undefined') {
        decodedKey = atob(apiKey);
      } else {
        decodedKey = Buffer.from(apiKey, 'base64').toString('utf-8');
      }
    } catch (error) {
      decodedKey = apiKey;
    }
    config.headers.Authorization = `Bearer ${decodedKey}`;
  }
  return config;
});

export const testHeygenAPI = {
  // Test API key validity
  async testApiKey() {
    try {
      console.log('🔍 Testing Heygen API key...');
      const response = await testAPI.get('/avatar/list');
      console.log('✅ API key is valid!');
      console.log('Available avatars:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ API key test failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  },

  // Test streaming session creation
  async testCreateSession() {
    try {
      console.log('🔍 Testing streaming session creation...');
      const response = await testAPI.post('/streaming.new', {
        avatar_name: 'avatar_001',
        quality: 'high',
        voice: {
          rate: 1.0,
          emotion: 'friendly'
        },
        version: 'v2',
        video_encoding: 'H264',
        source: 'sdk'
      });
      console.log('✅ Streaming session created successfully!');
      console.log('Session data:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Streaming session creation failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Heygen API tests...\n');
    
    const keyTest = await this.testApiKey();
    if (!keyTest.success) {
      console.log('❌ API key test failed. Stopping tests.');
      return;
    }
    
    console.log('\n---\n');
    
    const sessionTest = await this.testCreateSession();
    if (sessionTest.success) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed.');
    }
  }
};

// Export for browser console use
if (typeof window !== 'undefined') {
  window.testHeygenAPI = testHeygenAPI;
}

export default testHeygenAPI;
