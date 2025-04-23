import axios from 'axios';

const API_BASE_URL = 'https://guardianai-backend.sdk3010.repl.co';
const API_KEY = 'ESu++FGew14skiJjdywXokWEnUza5aiDmb1zQRYFoui+7/ww9v/xIphU0FQ9nzie0nPGT/T58aQt091W0sjUDA==';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API request failed:', error);
    // Return a formatted error to handle in the components
    return Promise.reject({
      message: error.response?.data?.message || 'Network error, please try again',
      status: error.response?.status || 500,
      data: error.response?.data
    });
  }
);

export const auth = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  signup: (name: string, email: string, password: string) => 
    api.post('/auth/signup', { name, email, password }),
  resetPassword: (email: string) =>
    api.post('/auth/reset-password', { email }),
  setNewPassword: (token: string, password: string) =>
    api.post('/auth/set-new-password', { token, password }),
};

export const users = {
  getInfo: () => api.get('/users'),
  uploadProfilePic: async (file: File) => {
    const formData = new FormData();
    formData.append('profilePic', file);
    return api.post('/users/profile-pic', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateProfile: (userData: any) => api.put('/users', userData),
};

export const alerts = {
  getAll: () => api.get('/alerts'),
  create: (alertData: any) => api.post('/alerts', alertData),
  delete: (alertId: string) => api.delete(`/alerts/${alertId}`),
  triggerEmergency: (location: { lat: number; lng: number }, message?: string) => 
    api.post('/trigger-alert', { location, message }),
};

export const contacts = {
  getAll: () => api.get('/contacts'),
  add: (contact: { name: string; phone: string; email: string; relationship?: string }) => 
    api.post('/contacts', contact),
  delete: (contactId: string) => api.delete(`/contacts/${contactId}`),
};

export const tracking = {
  start: (location: { lat: number; lng: number }) => 
    api.post('/track', { location }),
  getSafePlaces: (location: { lat: number; lng: number }) => 
    api.get('/map/safe-places', { params: location }),
};

// AI chatbot API with better error handling and retry logic
export const ai = {
  chat: async (message: string, conversationId?: string) => {
    try {
      console.log('Making AI chat request with message:', message);
      
      // Create a more robust chat request
      const response = await axios.post(
        `${API_BASE_URL}/ai/chat`, 
        { message, conversationId },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          timeout: 30000  // 30 seconds timeout for more reliability
        }
      );
      
      console.log('AI chat response received:', response.data);
      return response;
    } catch (error) {
      console.error('AI chat error:', error);
      // More detailed error handling to debug issues
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error setting up request:', error.message);
        }
      }
      throw error;
    }
  },
  
  textToSpeech: (text: string, voiceId?: string) => 
    api.post('/ai/text-to-speech', { text, voiceId }),
    
  search: (query: string) => 
    api.post('/ai/search', { query }),
    
  // New method to get Indian cities
  getIndianCities: async (state?: string, sort?: string) => {
    try {
      let url = 'https://indian-cities-api-nocbegfhqg.now.sh/cities';
      
      // Add query parameters if provided
      if (state || sort) {
        url += '?';
        if (state) url += `state=${encodeURIComponent(state)}`;
        if (state && sort) url += '&';
        if (sort) url += `sort=${encodeURIComponent(sort)}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching Indian cities:', error);
      throw error;
    }
  }
};

export default api;
