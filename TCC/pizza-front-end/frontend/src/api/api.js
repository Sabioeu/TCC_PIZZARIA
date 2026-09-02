import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
export const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws').replace(/\/api$/, '/ws/orders');

const api = axios.create({ baseURL: API_URL, timeout: 6000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(config => {
  try {
    const session = JSON.parse(localStorage.getItem('aurora_session') || 'null');
    const branchId = localStorage.getItem('aurora_branch_id');
    if (session?.token && !session.demo) config.headers.Authorization = `Bearer ${session.token}`;
    if (branchId) config.headers['X-Branch-Id'] = branchId;
  } catch { /* armazenamento indisponivel; requisicao segue sem sessao */ }
  return config;
});

export function apiMessage(error, fallback = 'Não foi possível concluir a operação') {
  return error?.response?.data?.detail || error?.response?.data?.message || fallback;
}

export default api;
