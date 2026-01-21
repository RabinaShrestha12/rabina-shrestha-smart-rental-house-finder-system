import axios from "axios";

const api = axios.create({
<<<<<<< HEAD
  baseURL: "http://127.0.0.1:8000",
=======
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/",
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
<<<<<<< HEAD
  const token = localStorage.getItem("access");

  // ✅ Only attach token if it is valid-looking and endpoint needs auth
  const isPublicAuthEndpoint =
    config.url?.includes("/api/register") ||
    config.url?.includes("/api/login");

  if (!isPublicAuthEndpoint && token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // ✅ ensure no Authorization header for register/login
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // ✅ 401/403 are common for invalid/expired token
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
    }
    return Promise.reject(err);
  }
);

=======
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
export default api;
