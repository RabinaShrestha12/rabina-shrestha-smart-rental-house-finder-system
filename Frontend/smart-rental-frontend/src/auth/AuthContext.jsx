import React, { createContext, useContext, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = "http://127.0.0.1:8000/api";

// Convert any form shape into backend login payload
// Accepts {email,password} OR {username,password}
const toLoginPayload = (form) => ({
  username: (form?.username ?? form?.email ?? "").trim(),
  password: form?.password ?? "",
});

// Normalize axios / fetch errors into a friendly Error(message)
const normalizeError = (err) => {
  // axios response error
  const status = err?.response?.status;
  const data = err?.response?.data;

  // your backend uses {"error":"..."} sometimes
  const backendMsg =
    data?.error ||
    data?.detail ||
    (typeof data === "string" ? data : "") ||
    "";

  if (backendMsg) return new Error(backendMsg);

  if (status) return new Error(`Request failed (status ${status}).`);

  // network error (server down, CORS etc.)
  if (err?.message) return new Error(err.message);

  return new Error("Something went wrong.");
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const access = localStorage.getItem("access") || "";
    const refresh = localStorage.getItem("refresh") || "";
    const role = localStorage.getItem("role") || "";
    const user_id = localStorage.getItem("user_id") || "";
    const username = localStorage.getItem("username") || "";
    return { access, refresh, role, user_id, username };
  });

  const setSession = (data) => {
    // expected: { tokens: {access,refresh}, role, user_id, username }
    const access = data?.tokens?.access || "";
    const refresh = data?.tokens?.refresh || "";
    const role = data?.role || "";
    const user_id = String(data?.user_id ?? "");
    const username = data?.username || "";

    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    localStorage.setItem("role", role);
    localStorage.setItem("user_id", user_id);
    localStorage.setItem("username", username);

    setAuth({ access, refresh, role, user_id, username });
  };

  const clearSession = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    setAuth({ access: "", refresh: "", role: "", user_id: "", username: "" });
  };

  // ----- LOGIN ADMIN -----
  const loginAdmin = async (form) => {
    try {
      const payload = toLoginPayload(form);

      if (!payload.username || !payload.password) {
        throw new Error("Username and password are required.");
      }

      // DEBUG: remove later if you want
      console.log("ADMIN LOGIN payload:", payload);

      const res = await axios.post(`${API_BASE}/login/`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      setSession(res.data);
      return res.data;
    } catch (err) {
      throw normalizeError(err);
    }
  };

  // ----- LOGIN USER (OWNER/TENANT) -----
  const loginUser = async (form) => {
    try {
      const payload = toLoginPayload(form);

      if (!payload.username || !payload.password) {
        throw new Error("Username and password are required.");
      }

      // DEBUG: remove later if you want
      console.log("USER LOGIN payload:", payload);

      const res = await axios.post(`${API_BASE}/login-user/`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      setSession(res.data);
      return res.data;
    } catch (err) {
      throw normalizeError(err);
    }
  };

  const logout = () => {
    clearSession();
  };

  // Add axios interceptor to attach access token automatically
  // (optional but useful for admin-only pages)
  useMemo(() => {
    axios.defaults.baseURL = API_BASE;
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("access");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }, []);

  const value = {
    auth,
    loginAdmin,
    loginUser,
    logout,
    setSession,
    clearSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
