import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Create axios instance
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post(API_ENDPOINTS.AUTH.LOGIN, credentials),
  logout: () => api.post(API_ENDPOINTS.AUTH.LOGOUT),
  register: (userData) => api.post(API_ENDPOINTS.AUTH.REGISTER, userData),
  getMe: () => api.get(API_ENDPOINTS.AUTH.ME),
  changePassword: (passwords) => api.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwords),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get(API_ENDPOINTS.USERS.LIST, { params }),
  getUser: (id) => api.get(API_ENDPOINTS.USERS.DETAIL(id)),
  updateUser: (id, data) => api.put(API_ENDPOINTS.USERS.UPDATE(id), data),
  deleteUser: (id) => api.delete(API_ENDPOINTS.USERS.DELETE(id)),
  toggleUserStatus: (id) => api.patch(API_ENDPOINTS.USERS.TOGGLE_STATUS(id)),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get(API_ENDPOINTS.DASHBOARD.STATS),
  getRecentActivity: (params) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITY, { params }),
  getContent: (params) => api.get(API_ENDPOINTS.DASHBOARD.CONTENT, { params }),
  createContent: (data) => api.post(API_ENDPOINTS.DASHBOARD.CREATE_CONTENT, data),
  updateContent: (id, data) => api.put(API_ENDPOINTS.DASHBOARD.UPDATE_CONTENT(id), data),
  deleteContent: (id) => api.delete(API_ENDPOINTS.DASHBOARD.DELETE_CONTENT(id)),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(API_ENDPOINTS.UPLOAD.IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadImages: (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return api.post(API_ENDPOINTS.UPLOAD.IMAGES, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteImage: (filename) => api.delete(API_ENDPOINTS.UPLOAD.DELETE_IMAGE(filename)),
  getImages: (params) => api.get(API_ENDPOINTS.UPLOAD.LIST_IMAGES, { params }),
};


// Health check
export const healthAPI = {
  check: () => api.get(API_ENDPOINTS.HEALTH),
};

export default api;
