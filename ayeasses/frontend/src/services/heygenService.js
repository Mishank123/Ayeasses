import axios from 'axios';
import { HEYGEN_CONFIG } from '../config/heygen';

// Create axios instance for Heygen API
const heygenAPI = axios.create({
  baseURL: HEYGEN_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add API key to Heygen requests
heygenAPI.interceptors.request.use((config) => {
  const apiKey = HEYGEN_CONFIG.getApiKey();
  console.log('🔍 Interceptor - API key check:', apiKey ? 'Present' : 'Missing');
  console.log('🔍 Interceptor - API key preview:', apiKey ? apiKey.substring(0, 20) + '...' : 'None');
  
  if (!apiKey || !HEYGEN_CONFIG.validateApiKey(apiKey)) {
    console.warn('⚠️ Heygen API key is missing or invalid. Using mock data.');
  }

  if (apiKey) {
    // Send the base64 encoded key directly (like in Angular project)
    console.log('🔑 Setting x-api-key header for Heygen API');
    config.headers['x-api-key'] = apiKey;
    console.log('🔑 x-api-key header set:', config.headers['x-api-key'] ? 'Yes' : 'No');
  }
  
  // Log Authorization header if present
  if (config.headers['Authorization']) {
    console.log('🔑 Authorization header present:', config.headers['Authorization'].substring(0, 20) + '...');
  }
  
  console.log('🔍 Final request config:', {
    url: config.url,
    method: config.method,
    headers: {
      'x-api-key': config.headers['x-api-key'] ? 'Present' : 'Missing',
      'Authorization': config.headers['Authorization'] ? 'Present' : 'Missing',
      'Content-Type': config.headers['Content-Type']
    }
  });
  
  return config;
});

// Add response interceptor to log responses
heygenAPI.interceptors.response.use(
  (response) => {
    console.log('✅ Heygen API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Heygen API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

class HeygenService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.streamId = null;
    this.accessToken = null;
    this.realtimeEndpoint = null;
    this.iceServers = null;
  }

  // Test method to check API connectivity
  async testApiConnection() {
    try {
      console.log('🔍 Testing Heygen API connection...');
      console.log('API Base URL:', HEYGEN_CONFIG.API_BASE_URL);
      console.log('API Key:', HEYGEN_CONFIG.getApiKey() ? 'Present' : 'Missing');
      
      const response = await heygenAPI.post('/streaming.create_token');
      
      console.log('✅ API connection test successful');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      return {
        success: true,
        message: 'API connection successful',
        data: response.data
      };
    } catch (error) {
      console.error('❌ API connection test failed');
      console.error('Error:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      
      return {
        success: false,
        message: 'API connection failed',
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  // Step 1: Create access token with /streaming.create_token
  async createStreamingToken() {
    try {
      console.log('Step 1: Creating streaming token with /streaming.create_token');
      console.log('API URL:', `${HEYGEN_CONFIG.API_BASE_URL}/streaming.create_token`);
      console.log('API Key:', HEYGEN_CONFIG.getApiKey() ? 'Present' : 'Missing');
      
      const response = await heygenAPI.post('/streaming.create_token');
      
      console.log('Heygen streaming token created - Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      
      // Log the complete response structure for debugging
      console.log('🔍 Complete response structure:', JSON.stringify(response.data, null, 2));
      console.log('🔍 response.data.data exists:', !!response.data.data);
      console.log('🔍 response.data.data.token exists:', !!response.data.data?.token);
      
      // Extract the access_token from the response
      let token = null;
      
      // Check if response has data structure with token object
      if (response.data && response.data.data && response.data.data.token) {
        const tokenData = response.data.data.token;
        console.log('🔍 Found response.data.data.token structure:', JSON.stringify(tokenData, null, 2));
        
        // The token might be a string or an object with a token property
        if (typeof tokenData === 'string') {
          token = tokenData;
          console.log('🔍 Found token as string in response.data.data.token');
        } else if (tokenData && tokenData.token) {
          token = tokenData.token;
          console.log('🔍 Found token in response.data.data.token.token');
        }
        
        if (token) {
          console.log('🔍 Token preview:', token.substring(0, 50) + '...');
        }
      } else if (response.data && response.data.access_token) {
        // Direct response structure (fallback)
        console.log('🔍 Using direct response.data.access_token structure');
        token = response.data.access_token;
        console.log('🔍 Found access_token in direct response.data.access_token:', token ? 'Yes' : 'No');
        if (token) {
          console.log('🔍 Token preview:', token.substring(0, 50) + '...');
        }
      }
      
      if (!token) {
        console.error('❌ No access_token found in response. Response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('No access_token found in response');
      }
      
      console.log('✅ Extracted access_token successfully:', token.substring(0, 20) + '...');
      
      this.accessToken = token;
      
      return {
        success: true,
        accessToken: this.accessToken,
        tokenData: response.data
      };
    } catch (error) {
      console.error('❌ Heygen streaming token creation error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error config:', error.config);
      
      // If it's a network error, provide more details
      if (error.code === 'NETWORK_ERROR') {
        console.error('❌ Network error - check if Heygen API is accessible');
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Step 2: Create streaming session with /streaming.new using token
  async createStreamingSession(params) {
    try {
      console.log('Step 2: Creating Heygen streaming session with /streaming.new:', params);
      console.log('Access Token:', this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'Missing');
      
      if (!this.accessToken) {
        throw new Error('Access token is required. Call createStreamingToken first.');
      }
      
      const avatarName = params.avatarName || 'Ann_Doctor_Sitting_public';
      
      const requestPayload = {
        avatar_name: avatarName,
        quality: 'high',
        voice: {
          rate: 1,
          emotion: 'excited',
          elevenlabs_settings: {}
        },
        version: 'v2',
        video_encoding: 'H264',
        source: 'sdk',
        ia_is_livekit_transport: false
      };

      console.log('🔍 Heygen /streaming.new request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('🔍 Heygen /streaming.new request headers:', {
        'Authorization': `Bearer ${this.accessToken.substring(0, 20)}...`,
        'x-api-key': 'Present',
        'Content-Type': 'application/json'
      });
      
      // Use heygenAPI instance with Authorization Bearer header
      const response = await heygenAPI.post('/streaming.new', requestPayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('✅ Heygen streaming session created - Full response:', response);
      console.log('✅ Heygen streaming session created - Response data:', response.data);
      console.log('✅ Heygen streaming session created - Response status:', response.status);
      
      // Log the complete response structure for debugging
      console.log('🔍 Complete streaming.new response structure:', JSON.stringify(response.data, null, 2));
      
      // Extract session_id as stream_id from the response (API returns data nested under response.data.data)
      const sessionData = response.data.data || response.data;
      this.streamId = sessionData.session_id;
      this.realtimeEndpoint = sessionData.realtime_endpoint;
      this.iceServers = sessionData.ice_servers;
      
      console.log('🔍 Extracted session data:', {
        streamId: this.streamId,
        realtimeEndpoint: this.realtimeEndpoint,
        iceServers: this.iceServers ? 'Present' : 'Missing'
      });
      
      if (!this.streamId) {
        console.error('❌ No session_id found in streaming.new response');
        throw new Error('No session_id found in streaming.new response');
      }
      
      return {
        success: true,
        streamId: this.streamId,
        realtimeEndpoint: this.realtimeEndpoint,
        iceServers: this.iceServers,
        sessionData: sessionData
      };
    } catch (error) {
      console.error('❌ Heygen streaming session creation error - Full error:', error);
      console.error('❌ Heygen streaming session creation error - Error message:', error.message);
      console.error('❌ Heygen streaming session creation error - Error response data:', error.response?.data);
      console.error('❌ Heygen streaming session creation error - Error response status:', error.response?.status);
      console.error('❌ Heygen streaming session creation error - Error config:', error.config);
      
      // Check if it's a network error
      if (error.code === 'NETWORK_ERROR') {
        console.error('❌ Network error - check if Heygen API is accessible');
      }
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        console.error('❌ Authentication error - check if token is valid');
      }
      
      // Check if it's a validation error
      if (error.response?.status === 400) {
        console.error('❌ Validation error - check request payload');
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        streamId: null
      };
    }
  }

  // Step 3: Get regions (optional)
  async getRegions() {
    try {
      console.log('Step 3 (Optional): Getting regions');
      
      const response = await heygenAPI.get('/regions', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('Heygen regions:', response.data);
      
      return {
        success: true,
        regions: response.data
      };
    } catch (error) {
      console.error('Heygen regions error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Step 4: Start streaming with /streaming.start using stream_id
  async startStreaming(streamId, avatarName = 'Ann_Doctor_Sitting_public') {
    try {
      console.log('Step 4: Starting streaming with /streaming.start');
      console.log('Stream ID:', streamId);
      console.log('Avatar Name:', avatarName);
      console.log('Access Token:', this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'Missing');
      
      if (!streamId) {
        throw new Error('Stream ID is required');
      }

      if (!this.accessToken) {
        throw new Error('Access token is required');
      }

      const requestPayload = {
        session_id: streamId,  // Changed from stream_id to session_id
        avatar_name: avatarName
      };

      console.log('Heygen /streaming.start request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('Heygen /streaming.start request headers:', {
        'Authorization': `Bearer ${this.accessToken.substring(0, 20)}...`,
        'x-api-key': 'Present',
        'Content-Type': 'application/json'
      });

      const response = await heygenAPI.post('/streaming.start', requestPayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('Heygen streaming started - Full response:', response);
      console.log('Heygen streaming started - Response data:', response.data);
      console.log('Heygen streaming started - Response status:', response.status);
      
      return {
        success: true,
        streamData: response.data
      };
    } catch (error) {
      console.error('Heygen streaming start error - Full error:', error);
      console.error('Heygen streaming start error - Error message:', error.message);
      console.error('Heygen streaming start error - Error response data:', error.response?.data);
      console.error('Heygen streaming start error - Error response status:', error.response?.status);
      console.error('Heygen streaming start error - Error config:', error.config);
      
      // Check if it's a network error
      if (error.code === 'NETWORK_ERROR') {
        console.error('Network error - check if Heygen API is accessible');
      }
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        console.error('Authentication error - check if token is valid');
      }
      
      // Check if it's a validation error
      if (error.response?.status === 400) {
        console.error('Validation error - check request payload');
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Step 5: Send text to avatar with /streaming.task using stream_id
  async sendTextToAvatar(streamId, text) {
    try {
      console.log('Step 5: Sending text to avatar with /streaming.task:', text.substring(0, 100) + '...');
      
      if (!streamId) {
        throw new Error('Stream ID is required');
      }

      if (!this.accessToken) {
        throw new Error('Access token is required');
      }
      
      const response = await heygenAPI.post('/streaming.task', {
        session_id: streamId,  // Changed from stream_id to session_id
        text: text,
        task_type: 'talk'
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('Text sent to avatar successfully:', response.data);
      
      return {
        success: true,
        taskId: response.data.task_id,
        taskData: response.data
      };
    } catch (error) {
      console.error('Heygen send text error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Complete streaming flow following the correct order
  async startAssessmentStreaming(params) {
    try {
      console.log('Starting complete Heygen streaming flow');

      // Test API connection first
      console.log('🔍 Testing API connection before starting...');
      const connectionTest = await this.testApiConnection();
      if (!connectionTest.success) {
        throw new Error(`API connection failed: ${connectionTest.message}`);
      }
      console.log('✅ API connection test passed');

      // Step 1: Create streaming token (get access_token)
      const tokenResult = await this.createStreamingToken();
      if (!tokenResult.success) {
        throw new Error('Failed to create streaming token');
      }

      // Step 2: Create streaming session with /streaming.new (get stream_id)
      const sessionResult = await this.createStreamingSession({
        avatarName: params.avatarName,
        quality: params.quality,
        voiceSettings: params.voiceSettings
      });
      if (!sessionResult.success) {
        throw new Error('Failed to create streaming session');
      }

      // Step 3: Skip regions call (optional and causing CORS issues)
      console.log('Step 3: Skipping regions call (optional)');

      // Step 4: Start streaming using the stream_id from streaming.new
      const startResult = await this.startStreaming(sessionResult.streamId, params.avatarName);
      if (!startResult.success) {
        throw new Error('Failed to start streaming');
      }

      // Step 5: Send first question if provided
      let taskId = null;
      if (params.firstQuestion) {
        const textResult = await this.sendTextToAvatar(sessionResult.streamId, params.firstQuestion);
        if (textResult.success) {
          taskId = textResult.taskId;
        }
      }

      return {
        success: true,
        sessionId: sessionResult.streamId,
        streamUrl: sessionResult.realtimeEndpoint,  // Changed from realtimeEndpoint to streamUrl
        accessToken: tokenResult.accessToken,
        realtimeEndpoint: sessionResult.realtimeEndpoint,
        iceServers: sessionResult.iceServers,
        taskId: taskId,
        assessmentId: params.assessmentId
      };

    } catch (error) {
      console.error('Error in complete Heygen streaming flow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Stop streaming session
  async stopStreamingSession(streamId) {
    try {
      console.log('Stopping Heygen streaming session:', streamId);
      
      if (!this.accessToken) {
        throw new Error('Access token is required');
      }
      
      // Close WebRTC connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Call Heygen stop API
      const response = await heygenAPI.post('/streaming.stop', {
        session_id: streamId  // Changed from stream_id to session_id
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('Heygen streaming session stopped:', response.data);
      
      return {
        success: true,
        streamId: streamId,
        message: 'Session stopped successfully'
      };
    } catch (error) {
      console.error('Heygen streaming stop error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Get peer connection for external access
  getPeerConnection() {
    return this.peerConnection;
  }

  // Get local stream for external access
  getLocalStream() {
    return this.localStream;
  }

  // Get remote stream for external access
  getRemoteStream() {
    return this.remoteStream;
  }

  // Get current stream ID
  getStreamId() {
    return this.streamId;
  }

  // Get current access token
  getAccessToken() {
    return this.accessToken;
  }
}

const heygenServiceInstance = new HeygenService();
export default heygenServiceInstance;
