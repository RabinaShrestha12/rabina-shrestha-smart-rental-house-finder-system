// src/api/axios.js
import axios from "axios";

// ✅ Base URL MUST end with /api/ because your Django routes are under /api/...
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    // Normalize URL for consistent checks (handles "/verify-otp/" vs "verify-otp/")
    const url = String(config.url || "").replace(/^\//, ""); // remove leading "/"

    // ✅ Public endpoints (NO Bearer token)
    const isPublicEndpoint =
      url.includes("register_user/") ||
      url.includes("login_user/") ||
      url.includes("register/") || // admin register
      url.includes("login/") || // admin login
      url.includes("verify-otp/") || // ✅ OTP verify
      url.includes("resend-verification/") || // ✅ resend
      url.startsWith("public/");

    // Attach token only for protected endpoints
    if (!isPublicEndpoint && token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // FormData support (do not manually set Content-Type)
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
      delete config.headers["Content-Type"];
    } else {
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
    if (err?.response?.status === 401) {
      // Clear session on Unauthorized
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
    }
    return Promise.reject(err);
  }
);

export default api;
