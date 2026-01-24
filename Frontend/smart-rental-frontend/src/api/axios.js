// src/api/axios.js
import axios from "axios";

const api = axios.create({
  // baseURL includes /api
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api",
  // ✅ Don't set default Content-Type here.
  // File uploads (FormData) will break if you force application/json.
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    // Public auth endpoints (no token)
    const isPublicAuthEndpoint =
      config.url?.includes("/register") ||
      config.url?.includes("/login") ||
      config.url?.includes("/register_user") ||
      config.url?.includes("/login_user") ||
      config.url?.includes("/register_admin") ||
      config.url?.includes("/login_admin");

    // ✅ Attach JWT token for protected endpoints
    if (!isPublicAuthEndpoint && token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // ✅ Handle Content-Type safely
    // If sending FormData (images/files), DO NOT set Content-Type manually.
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
      // browser will set: multipart/form-data; boundary=....
      delete config.headers["Content-Type"];
    } else {
      // default JSON for normal requests
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // ✅ Clear tokens only when truly unauthorized/expired
    if (err?.response?.status === 401) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
    }
    return Promise.reject(err);
  }
);

export default api;
