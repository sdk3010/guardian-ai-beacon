
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
};

export const alerts = {
  getAll: () => api.get('/alerts'),
  create: (alertData: any) => api.post('/alerts', alertData),
  triggerEmergency: (location: { lat: number; lng: number }) => 
    api.post('/trigger-alert', { location }),
};

export const contacts = {
  getAll: () => api.get('/contacts'),
  add: (contact: { name: string; phone: string; email: string }) => 
    api.post('/contacts', contact),
};

export const tracking = {
  start: (location: { lat: number; lng: number }) => 
    api.post('/track', { location }),
  getSafePlaces: (location: { lat: number; lng: number }) => 
    api.get('/map/safe-places', { params: location }),
};
