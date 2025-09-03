// Heygen API Configuration
export const HEYGEN_CONFIG = {
  // API Base URL - Direct HeyGen API calls
  API_BASE_URL: 'https://api.heygen.com/v1',
  
  // API Key - can be set via environment variable or localStorage
  getApiKey: () => {
    const envKey = process.env.REACT_APP_HEYGEN_API_KEY;
    const localKey = localStorage.getItem('heygen_api_key');
    const validKey = 'NjY1MDY4OTYyOThiNGZjZWFkM2FiYjBkZjgwZjdkODUtMTc1Mjc0NDQxNQ=='; // Valid Heygen API key
    
    const apiKey = envKey || localKey || validKey;
    
    if (!envKey && !localKey) {
      console.log('✅ Using valid Heygen API key from configuration');
    }
    
    return apiKey;
  },
  
  // Validate API key format
  validateApiKey: (apiKey) => {
    if (!apiKey) return false;
    
    // For base64 encoded keys, just check if it's a valid base64 string
    try {
      if (typeof window !== 'undefined') {
        atob(apiKey); // Test if it's valid base64
      } else {
        Buffer.from(apiKey, 'base64').toString('utf-8');
      }
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Available avatar names in Heygen
  AVATARS: {
    'dr-jane-doe': 'Ann_Doctor_Sitting_public',
    'dr-jacob-jones': 'Ann_Doctor_Sitting_public',
    'default': 'Ann_Doctor_Sitting_public'
  },
  
  // Default avatar settings
  DEFAULT_AVATAR: 'avatar_001',
  DEFAULT_QUALITY: 'high',
  DEFAULT_VOICE_SETTINGS: {
    rate: 1.0,
    emotion: 'friendly',
    elevenlabs_settings: {}
  },
  
  // API endpoints
  ENDPOINTS: {
    CREATE_SESSION: '/streaming.new',
    START_SESSION: '/streaming.start',
    SEND_TEXT: '/streaming.task',
    STOP_SESSION: '/streaming.stop',
    GET_AVATARS: '/avatar/list'
  }
};

export default HEYGEN_CONFIG;
