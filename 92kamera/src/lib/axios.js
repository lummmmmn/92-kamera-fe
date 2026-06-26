/**
 * Axios instance — cấu hình tập trung
 *
 * baseURL đọc từ env VITE_API_URL (được inject khi deploy)
 * Fallback localhost:3000/api khi dev local
 *
 * Auth token sẽ được inject tự động vào mọi request qua interceptor
 * sau khi admin login (gọi setAuthToken)
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://nine2kamera-be.onrender.com/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Auth token management ──
let _token = null;

export function setAuthToken(token) {
  _token = token;
}

export function clearAuthToken() {
  _token = null;
}

// Request interceptor: tự động đính token nếu có
api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

// Response interceptor: handle lỗi phổ biến
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearAuthToken();
      // Có thể dispatch event để App biết cần logout
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(err);
  }
);

export default api;
