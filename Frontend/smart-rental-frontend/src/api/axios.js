// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    const isPublicAuthEndpoint =
      config.url?.includes("/register") ||
      config.url?.includes("/login") ||
      config.url?.includes("/register_user") ||
      config.url?.includes("/login_user") ||
      config.url?.includes("/register_admin") ||
      config.url?.includes("/login_admin") ||
      config.url?.startsWith("/public/");

    if (!isPublicAuthEndpoint && token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

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
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
    }
    return Promise.reject(err);
  }
);

export default api;
