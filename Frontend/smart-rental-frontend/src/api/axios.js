// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/",
});

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

api.interceptors.request.use(
  (config) => {
    const url = String(config.url || "").replace(/^\//, "");

    const isPublicEndpoint =
      url.startsWith("public/") ||
      url.includes("register_user/") ||
      url.includes("login_user/") ||
      url.includes("login_admin/") ||
      url.includes("verify-otp/") ||
      url.includes("resend-verification/");

    const token = getAccessToken();

    if (!isPublicEndpoint && token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // FormData support
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;
    if (isFormData) {
      delete config.headers["Content-Type"];
    } else if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("access");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
    }
    return Promise.reject(err);
  }
);

export default api;
