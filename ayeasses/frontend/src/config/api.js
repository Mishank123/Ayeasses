const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    ME: `${API_BASE_URL}/api/auth/me`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
  },
  USERS: {
    LIST: `${API_BASE_URL}/api/users`,
    DETAIL: (id) => `${API_BASE_URL}/api/users/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/api/users/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/users/${id}`,
    TOGGLE_STATUS: (id) => `${API_BASE_URL}/api/users/${id}/toggle-status`,
  },
  DASHBOARD: {
    STATS: `${API_BASE_URL}/api/dashboard/stats`,
    RECENT_ACTIVITY: `${API_BASE_URL}/api/dashboard/recent-activity`,
    CONTENT: `${API_BASE_URL}/api/dashboard/content`,
    CREATE_CONTENT: `${API_BASE_URL}/api/dashboard/content`,
    UPDATE_CONTENT: (id) => `${API_BASE_URL}/api/dashboard/content/${id}`,
    DELETE_CONTENT: (id) => `${API_BASE_URL}/api/dashboard/content/${id}`,
  },
  UPLOAD: {
    IMAGE: `${API_BASE_URL}/api/upload/image`,
    IMAGES: `${API_BASE_URL}/api/upload/images`,
    DELETE_IMAGE: (filename) => `${API_BASE_URL}/api/upload/image/${filename}`,
    LIST_IMAGES: `${API_BASE_URL}/api/upload/images`,
  },
  HEYGEN: {
    SESSION: `${API_BASE_URL}/api/heygen/session`,
    SESSION_STATUS: (sessionId) => `${API_BASE_URL}/api/heygen/session/${sessionId}/status`,
    END_SESSION: (sessionId) => `${API_BASE_URL}/api/heygen/session/${sessionId}/end`,
    AVATARS: `${API_BASE_URL}/api/heygen/avatars`,
  },
  HEALTH: `${API_BASE_URL}/api/health`,
};

export default API_BASE_URL;
