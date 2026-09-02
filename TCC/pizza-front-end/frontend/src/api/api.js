import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  timeout: 3500,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
