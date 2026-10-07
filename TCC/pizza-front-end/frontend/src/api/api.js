// frontend/src/api/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    timeout: 12000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let csrfToken = null;
let csrfRequest = null;
export const limparCsrf = () => { csrfToken = null; csrfRequest = null; };
api.interceptors.request.use(async (config) => {
    if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
        if (!csrfToken) {
            if (!csrfRequest) csrfRequest = api.get('/auth/csrf').then(({ data }) => { csrfToken = data; return data; }).finally(() => { csrfRequest = null; });
            await csrfRequest;
        }
        config.headers[csrfToken.headerName] = csrfToken.token;
    }
    return config;
});
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
        limparCsrf(); window.dispatchEvent(new Event('pizza:session-expired'));
    }
    if (error.response?.status === 403) limparCsrf();
    return Promise.reject(error);
});

export default api;
