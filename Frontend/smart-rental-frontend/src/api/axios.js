// src/api/axios.js
import axios from "axios";

// ✅ Base URL must end with /api/
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

// ✅ Detect public endpoints (NO token)
function isPublicEndpoint(urlRaw) {
  const url = String(urlRaw || "").replace(/^\//, "");

  return (
    url.includes("register_user/") ||
    url.includes("login_user/") ||
    url.includes("register/") || // admin register
    url.includes("login/") || // admin login
    url.includes("verify-otp/") || // OTP verify
    url.includes("resend-verification/") || // resend
    url.startsWith("public/") ||
    url.startsWith("token/") // token/refresh, token/verify etc
  );
}

// ✅ REQUEST interceptor
api.interceptors.request.use(
  (config) => {
    // ✅ IMPORTANT: remove leading "/" so baseURL always works correctly
    if (typeof config.url === "string") {
      config.url = config.url.replace(/^\//, "");
    }

    const token = localStorage.getItem("access");

    // Attach token only if NOT public
    if (
      !isPublicEndpoint(config.url) &&
      token &&
      token !== "undefined" &&
      token !== "null"
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // FormData support (don't set content-type manually)
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

// ✅ RESPONSE interceptor with refresh token logic
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, newToken = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(newToken)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // If public endpoint failed with 401, just return error (don't refresh)
    if (isPublicEndpoint(original?.url)) return Promise.reject(err);

    // Only handle 401 once
    if (err?.response?.status === 401 && !original?._retry) {
      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("user_id");
        localStorage.removeItem("username");
        return Promise.reject(err);
      }

      // If already refreshing, queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // NOTE: Use a plain axios call (not api) to avoid interceptor recursion
        const refreshRes = await axios.post(`${BASE_URL}token/refresh/`, {
          refresh,
        });

        const newAccess = refreshRes?.data?.access;
        if (!newAccess) throw new Error("No access token returned from refresh");

        localStorage.setItem("access", newAccess);

        // Update queued requests
        processQueue(null, newAccess);

        // Retry original request
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        localStorage.removeItem("user_id");
        localStorage.removeItem("username");

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
