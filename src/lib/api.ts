
import axios from 'axios';

const API_BASE_URL = 'https://guardianai-backend.sdk3010.repl.co';
const API_KEY = 'ESu++FGew14skiJjdywXokWEnUza5aiDmb1zQRYFoui+7/ww9v/xIphU0FQ9nzie0nPGT/T58aQt091W0sjUDA==';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
});

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

// New AI chatbot API
export const ai = {
  chat: (message: string, conversationId?: string) => 
    api.post('/ai/chat', { message, conversationId }),
  textToSpeech: (text: string, voiceId?: string) => 
    api.post('/ai/text-to-speech', { text, voiceId }),
  search: (query: string) => 
    api.post('/ai/search', { query }),
};

export default api;
