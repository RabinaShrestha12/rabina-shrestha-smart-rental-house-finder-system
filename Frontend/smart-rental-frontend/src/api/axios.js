import axios from "axios";

const api = axios.create({
  // baseURL already includes /api
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");

  // Public auth endpoints (no token)
  const isPublicAuthEndpoint =
    config.url?.includes("/register") ||
    config.url?.includes("/login") ||
    config.url?.includes("/register_user") ||
    config.url?.includes("/login_user") ||
    config.url?.includes("/register_admin") ||
    config.url?.includes("/login_admin");

  if (!isPublicAuthEndpoint && token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
    }
    return Promise.reject(err);
  }
);

export default api;
