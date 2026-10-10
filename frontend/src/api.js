import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

// Attach admin password if logged in
api.interceptors.request.use((config) => {
  const pwd = sessionStorage.getItem('adminPwd');
  if (pwd) config.headers['x-admin-password'] = pwd;
  return config;
});

export default api;
export { API_URL };