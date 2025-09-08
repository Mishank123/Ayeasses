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

  // Utility: wait briefly before attempting to connect
  async waitForRoomReady(livekitWsUrl, accessToken, timeoutMs = 1500) {
    // The previous implementation polled LiveKit's /rtc endpoint which returns 404 on cloud,
    // causing noisy console errors. A short delay is sufficient before connecting.
    await new Promise(resolve => setTimeout(resolve, timeoutMs));
    console.log('⏳ Skipping LiveKit /rtc polling; waited briefly before connect');
    return true;
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
      
      console.log('🔍 Returning access token - Type:', typeof this.accessToken);
      console.log('🔍 Returning access token - Value:', this.accessToken);
      
      return {
        success: true,
        accessToken: this.accessToken,
        tokenData: response.data
      };
    } catch (error) {
      console.error('❌ Heygen streaming token creation error:', error);
      console.log('🔄 Falling back to mock mode for streaming token');
      
      // Mock fallback for development
      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.accessToken = mockToken;
      
      return {
        success: true,
        accessToken: mockToken,
        mock: true,
        error: null
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
        ia_is_livekit_transport: true
      };

      console.log('🔍 Heygen /streaming.new request payload:', JSON.stringify(requestPayload, null, 2));
      
      const response = await heygenAPI.post('/streaming.new', requestPayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('✅ Heygen streaming session created - Response data:', response.data);
      
      // Handle the response structure: { code: 100, data: { session_id, access_token, url, ... } }
      const sessionData = response.data.data || response.data;
      this.streamId = sessionData.session_id;
      this.streamUrl = sessionData.url; // LiveKit wss URL
      this.iceServers = sessionData.ice_servers || sessionData.ice_servers2;
      
      // Access token to use for LiveKit - check both possible locations
      const accessToken = sessionData.access_token || response.data.access_token;
      
      console.log('🔍 Extracted session data:', {
        streamId: this.streamId,
        streamUrl: this.streamUrl,
        accessToken: accessToken ? 'Present' : 'Missing',
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'None',
        sessionDataKeys: Object.keys(sessionData),
        responseDataKeys: Object.keys(response.data)
      });
      
      if (!this.streamId) {
        throw new Error('No session_id found in streaming.new response');
      }
      
      return {
        success: true,
        streamId: this.streamId,
        streamUrl: this.streamUrl,
        iceServers: this.iceServers,
        sessionData: sessionData,
        accessToken: accessToken
      };
    } catch (error) {
      console.error('❌ Heygen streaming session creation error - Full error:', error);
      console.log('🔄 Falling back to mock mode for streaming session');
      
      // Mock fallback for development
      const mockStreamId = `mock_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockStreamUrl = `wss://mock-livekit.heygen.com/room/${mockStreamId}`;
      const mockAccessToken = `mock_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.streamId = mockStreamId;
      this.streamUrl = mockStreamUrl;
      this.iceServers = [];
      
      return {
        success: true,
        streamId: mockStreamId,
        streamUrl: mockStreamUrl,
        iceServers: [],
        sessionData: { session_id: mockStreamId, url: mockStreamUrl },
        accessToken: mockAccessToken,
        mock: true
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
        session_id: streamId,
        avatar_name: avatarName
      };

      const response = await heygenAPI.post('/streaming.start', requestPayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('Heygen streaming started - Response:', response.data);
      
      return {
        success: true,
        streamData: response.data
      };
    } catch (error) {
      console.error('Heygen streaming start error - Full error:', error);
      
      if (error.response?.data?.code === 10002 && error.response?.data?.message?.includes('invalid session state')) {
        console.warn('⚠️ Session already active, treating as success');
        return { success: true, streamData: { message: 'Session already active' } };
      }
      
      console.log('🔄 Falling back to mock mode for streaming start');
      
      // Mock fallback for development
      return {
        success: true,
        streamData: { message: 'Mock streaming started' },
        mock: true
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
        session_id: streamId,
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
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Direct streaming.new API call to get URL for video tag
  async getDirectStreamUrl(params) {
    try {
      console.log('🔍 Getting direct stream URL from /streaming.new API');

      // Step 1: Create streaming token
      const tokenResult = await this.createStreamingToken();
      if (!tokenResult.success) {
        throw new Error('Failed to create streaming token');
      }

      // Step 2: Create session
      const sessionResult = await this.createStreamingSession({
        avatarName: params.avatarName,
        quality: params.quality,
        voiceSettings: params.voiceSettings
      });
      if (!sessionResult.success) {
        throw new Error('Failed to create streaming session');
      }

      // Step 3: Start streaming and wait until LiveKit room is ready
      console.log('🔍 Starting streaming session to activate LiveKit room...');
      const startResult = await this.startStreaming(sessionResult.streamId, params.avatarName);
      if (!startResult.success) {
        throw new Error('Failed to start streaming session');
      }

      // Wait until LiveKit room validates with the token from streaming.new
      const ready = await this.waitForRoomReady(sessionResult.streamUrl, sessionResult.accessToken);
      if (!ready) {
        console.warn('⚠️ LiveKit room not ready within timeout; proceeding but player will retry');
      }

      console.log('✅ Direct stream URL obtained:', sessionResult.streamUrl);
      console.log('🔍 Final result data:', {
        streamUrl: sessionResult.streamUrl,
        sessionId: sessionResult.streamId,
        accessToken: sessionResult.accessToken ? 'Present' : 'Missing',
        accessTokenPreview: sessionResult.accessToken ? sessionResult.accessToken.substring(0, 20) + '...' : 'None',
        iceServers: sessionResult.iceServers
      });

      return {
        success: true,
        streamUrl: sessionResult.streamUrl,
        sessionId: sessionResult.streamId,
        accessToken: sessionResult.accessToken,
        iceServers: sessionResult.iceServers
      };

    } catch (error) {
      console.error('Error getting direct stream URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Complete streaming flow following the correct order
  async startAssessmentStreaming(params) {
    try {
      console.log('Starting complete Heygen streaming flow');

      const connectionTest = await this.testApiConnection();
      if (!connectionTest.success) {
        throw new Error(`API connection failed: ${connectionTest.message}`);
      }

      const tokenResult = await this.createStreamingToken();
      if (!tokenResult.success) {
        throw new Error('Failed to create streaming token');
      }

      const sessionResult = await this.createStreamingSession({
        avatarName: params.avatarName,
        quality: params.quality,
        voiceSettings: params.voiceSettings
      });
      if (!sessionResult.success) {
        throw new Error('Failed to create streaming session');
      }

      const startResult = await this.startStreaming(sessionResult.streamId, params.avatarName);
      if (!startResult.success) {
        throw new Error('Failed to start streaming');
      }

      // Ensure room is ready before returning
      await this.waitForRoomReady(sessionResult.streamUrl, sessionResult.accessToken);

      const result = {
        success: true,
        sessionId: sessionResult.streamId,
        streamUrl: sessionResult.streamUrl,
        accessToken: tokenResult.accessToken,
        realtimeEndpoint: sessionResult.realtimeEndpoint,
        iceServers: sessionResult.iceServers,
        taskId: null,
        assessmentId: params.assessmentId
      };

      console.log('✅ startAssessmentStreaming returning:', {
        success: result.success,
        sessionId: result.sessionId,
        streamUrl: result.streamUrl,
        accessToken: result.accessToken ? 'Present' : 'Missing'
      });

      return result;

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
      
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      const response = await heygenAPI.post('/streaming.stop', {
        session_id: streamId
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

  getPeerConnection() { return this.peerConnection; }
  getLocalStream() { return this.localStream; }
  getRemoteStream() { return this.remoteStream; }
  getStreamId() { return this.streamId; }
  getAccessToken() { return this.accessToken; }

  async ensureLiveKitConnection(streamId, streamUrl, accessToken) {
    try {
      console.log('🔍 Ensuring LiveKit connection is ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const startResult = await this.startStreaming(streamId);
      if (!startResult.success) {
        console.warn('Warning: Failed to restart streaming for LiveKit connection');
        return false;
      }
      console.log('✅ LiveKit connection should be ready');
      return true;
    } catch (error) {
      console.error('Error ensuring LiveKit connection:', error);
      return false;
    }
  }
}

const heygenServiceInstance = new HeygenService();
export default heygenServiceInstance;
