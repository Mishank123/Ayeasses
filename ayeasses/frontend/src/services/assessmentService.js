import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const assessmentAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/assessments`,
  timeout: 30000,
});

// Request interceptor to add auth token
assessmentAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
assessmentAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class AssessmentService {
  // Create assessment
  async createAssessment(assessmentData, file = null) {
    try {
      const response = await assessmentAPI.post('/', assessmentData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create assessment',
        details: error.response?.data?.details || null,
      };
    }
  }

  // Get all assessments with pagination and filters (admin)
  async getAssessments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);

      const response = await assessmentAPI.get(`/admin?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch assessments',
      };
    }
  }

  // Get all published assessments for public access
  async getPublicAssessments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);

      const response = await axios.get(`${API_BASE_URL}/api/assessments?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch assessments',
      };
    }
  }

  // Get assessment by UUID for public access
  async getPublicAssessment(uuid) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/assessments/${uuid}`);
      return { success: true, data: response.data.assessment || response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch assessment',
      };
    }
  }

  // Get assessment by ID
  async getAssessmentById(id) {
    try {
      const response = await assessmentAPI.get(`/id/${id}`);
      return { success: true, data: response.data.assessment };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch assessment',
      };
    }
  }

  // Get avatar configuration for assessment
  async getAvatarConfig(assessmentId) {
    try {
      const response = await assessmentAPI.get(`/id/${assessmentId}/avatar-config`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch avatar configuration',
      };
    }
  }

  // Update assessment
  async updateAssessment(id, assessmentData, file = null) {
    try {
      const response = await assessmentAPI.put(`/id/${id}`, assessmentData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update assessment',
        details: error.response?.data?.details || null,
      };
    }
  }

  // Delete assessment
  async deleteAssessment(id) {
    try {
      const response = await assessmentAPI.delete(`/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete assessment',
      };
    }
  }

  // Publish assessment
  async publishAssessment(id, publishData = null) {
    try {
      let response;
      
      if (publishData) {
        // Send publish data as JSON
        response = await assessmentAPI.patch(`/id/${id}/publish`, publishData, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Send empty data
        response = await assessmentAPI.patch(`/id/${id}/publish`, {}, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to publish assessment',
        details: error.response?.data?.details || null,
      };
    }
  }

  // Download assessment file
  getFileUrl(filename) {
    return `${API_BASE_URL.replace('/api', '')}/uploads/assessments/${filename}`;
  }

  // Start assessment with Heygen streaming directly
  async startAssessment(assessmentId, mode = 'video', avatarConfig = null) {
    let heygenResult = null;
    let finalAvatarConfig = null;
    
    try {
      console.log('Starting assessment with frontend Heygen integration:', { assessmentId, mode });
      
      // Use provided avatar config or get from session storage
      finalAvatarConfig = avatarConfig;
      if (!finalAvatarConfig && assessmentId) {
        const storedConfig = sessionStorage.getItem(`avatarConfig_${assessmentId}`);
        if (storedConfig) {
          finalAvatarConfig = JSON.parse(storedConfig);
        }
      }

      // Map avatar configuration to Heygen parameters
      const avatarName = finalAvatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Ann_Doctor_Sitting_public' : 'Ann_Doctor_Sitting_public';
      const voiceSettings = {
        rate: 1.0,
        emotion: finalAvatarConfig?.voiceTone || 'excited',
        elevenlabs_settings: {}
      };

      const firstQuestion = finalAvatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience.";

      console.log('Creating Heygen streaming session directly with params:', {
        avatarName,
        voiceSettings,
        firstQuestion: firstQuestion.substring(0, 100) + '...'
      });

      // Create Heygen streaming session directly from frontend
      const heygenService = (await import('./heygenService')).default;
      heygenResult = await heygenService.startAssessmentStreaming({
        avatarName,
        quality: 'high',
        voiceSettings,
        assessmentId: assessmentId,
        firstQuestion
      });

      if (!heygenResult.success) {
        throw new Error('Failed to create Heygen streaming session');
      }

      console.log('Heygen streaming session created successfully:', {
        sessionId: heygenResult.sessionId,
        streamUrl: heygenResult.streamUrl,
        mock: heygenResult.mock || false
      });

      // Create assessment session record in backend (minimal data)
      const sessionResponse = await assessmentAPI.post(`/${assessmentId}/create-session`, {
        heygenSessionId: heygenResult.sessionId,
        streamUrl: heygenResult.streamUrl,
        mode: mode,
        avatarConfig: finalAvatarConfig || {}
      });

      if (!sessionResponse.data.success) {
        // Check if it's an "already has active session" error
        if (sessionResponse.data.error && sessionResponse.data.error.includes('already have an active session')) {
          console.log('User already has active session, returning existing session data');
          return {
            success: true,
            data: {
              sessionId: sessionResponse.data.sessionId,
              streamUrl: sessionResponse.data.streamUrl,
              heygenSessionId: heygenResult.sessionId,
              messageId: heygenResult.messageId,
              mock: heygenResult.mock || false,
              avatarConfig: finalAvatarConfig || {},
              existingSession: true
            }
          };
        }
        throw new Error('Failed to create assessment session record');
      }

      return { 
        success: true, 
        data: {
          ...sessionResponse.data,
          heygenSessionId: heygenResult.sessionId,
          streamUrl: heygenResult.streamUrl,
          messageId: heygenResult.messageId,
          mock: heygenResult.mock || false,
          avatarConfig: finalAvatarConfig || {}
        }
      };
    } catch (error) {
      console.error('Start assessment error:', error);
      
      // Check if it's an "already has active session" error with existing session data
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already have an active session')) {
        console.log('User already has active session, returning existing session data');
        return {
          success: true,
          data: {
            sessionId: error.response.data.sessionId,
            streamUrl: error.response.data.streamUrl,
            heygenSessionId: null, // Will be set by Heygen service
            messageId: null, // Will be set by Heygen service
            mock: false,
            avatarConfig: finalAvatarConfig || {},
            existingSession: true
          }
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to start assessment',
      };
    }
  }

  // Stop assessment session
  async stopAssessment(assessmentId) {
    try {
      const response = await assessmentAPI.post(`/${assessmentId}/stop`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to stop assessment',
      };
    }
  }

  // Get assessment session status
  async getAssessmentSession(assessmentId) {
    try {
      const response = await assessmentAPI.get(`/${assessmentId}/session`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get assessment session',
      };
    }
  }

  // Send text to streaming session
  async sendTextToAssessment(assessmentId, text) {
    try {
      const response = await assessmentAPI.post(`/${assessmentId}/send-text`, { text });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send text',
      };
    }
  }

  // Send user reply to AvatarAI and get next question
  async sendReplyToAssessment(assessmentId, userReply, chatSessionId = null) {
    try {
      const payload = { userReply };
      if (chatSessionId) {
        payload.Id = chatSessionId;
      }
      
      const response = await assessmentAPI.post(`/${assessmentId}/send-reply`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send reply',
        details: error.response?.data?.details || null,
      };
    }
  }

  // New chat method that integrates with AvatarAI completions API
  async chatToAssessment(assessmentId, userReply, chatSessionId = null) {
    try {
      const payload = { user_reply: userReply };
      if (chatSessionId) {
        payload.chat_session_id = chatSessionId;
      }
      
      const response = await assessmentAPI.post(`/${assessmentId}/chat`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send chat message',
        details: error.response?.data?.details || null,
      };
    }
  }

  // Direct AvatarAI API call from frontend
  async callAvatarAIDirectly(userReply, courseId, userId, userName, chatSessionId = null, doctorName, doctorAvatar, doctorTone, doctorMood, messageId = null, welcomeMessage = "Welcome to this assessment! I'm here to guide you through this learning experience.") {
    try {
      // Generate unique session ID and message ID for each interaction
      const uniqueChatSessionId = chatSessionId || `session_${Date.now()}`;
      const uniqueMessageId = messageId || `msg_${Date.now()}`;
      
      const payload = {
        user_reply: userReply,
        course_id: courseId,
        user_id: userId,
        user_name: userName,
        chat_session_id: uniqueChatSessionId,
        doctor_name: doctorName,
        doctor_avatar: doctorAvatar,
        doctor_tone: doctorTone,
        doctor_mood: doctorMood,
        message_id: uniqueMessageId,
        welcome_message: welcomeMessage
      };

      console.log('AvatarAI API call with unique IDs:', {
        chatSessionId: uniqueChatSessionId,
        messageId: uniqueMessageId,
        userReply: userReply,
        courseId: courseId
      });
      
      console.log('AvatarAI API payload:', payload);

      const response = await axios.post(
        'https://avatarai.awwwex.com/v1/agents/completions',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_AVATARAI_API_KEY || 'your-avatarai-api-key-here'}`
          },
          timeout: 30000
        }
      );

      return { 
        success: true, 
        data: response.data,
        sessionId: uniqueChatSessionId,
        messageId: uniqueMessageId
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to call AvatarAI API',
        details: error.response?.data || null,
      };
    }
  }

  // Send initial "hi" message to start conversation
  async sendInitialHi(courseId, userId, userName, doctorName, doctorAvatar, doctorTone, doctorMood, welcomeMessage = "Welcome to this assessment! I'm here to guide you through this learning experience.") {
    try {
      const chatSessionId = `session_${Date.now()}`;
      
      const payload = {
        user_reply: "hi",
        course_id: courseId,
        user_id: userId,
        user_name: userName,
        chat_session_id: chatSessionId,
        doctor_name: doctorName,
        doctor_avatar: doctorAvatar,
        doctor_tone: doctorTone,
        doctor_mood: doctorMood,
        message_id: `msg_${Date.now()}`, // Always include message_id for initial hi
        welcome_message: welcomeMessage
      };

      console.log('sendInitialHi - courseId:', courseId);
      console.log('sendInitialHi - payload:', payload);

      const response = await axios.post(
        'https://avatarai.awwwex.com/v1/agents/completions',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_AVATARAI_API_KEY || 'your-avatarai-api-key-here'}`
          },
          timeout: 30000
        }
      );

      return { 
        success: true, 
        data: response.data,
        chatSessionId: chatSessionId
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send initial hi',
        details: error.response?.data || null,
      };
    }
  }
}

const assessmentService = new AssessmentService();
export default assessmentService;
