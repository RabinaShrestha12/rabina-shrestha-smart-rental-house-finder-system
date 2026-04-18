import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

// ✅ ONLY accept exact roles, no guessing tenant
function normalizeRole(raw) {
  const r = String(raw || "").trim().toLowerCase();
  if (["admin", "owner", "tenant", "provider"].includes(r)) return r;
  if (["service_provider", "service provider", "service-provider"].includes(r)) return "provider";
  return "";
}

function extractTokens(data) {
  return {
    access: data?.access || data?.access_token || data?.tokens?.access || "",
    refresh: data?.refresh || data?.refresh_token || data?.tokens?.refresh || "",
  };
}

function extractError(err) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    "Request failed"
  );
}

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(localStorage.getItem("access") || "");
  const [role, setRole] = useState(normalizeRole(localStorage.getItem("role") || ""));
  const [email, setEmail] = useState(localStorage.getItem("email") || "");

  const isAuthed = !!access;

  const saveSession = (data, fallbackEmail = "") => {
    const tokens = extractTokens(data);

    if (tokens.access) {
      localStorage.setItem("access", tokens.access);
      setAccess(tokens.access);
    }
    if (tokens.refresh) {
      localStorage.setItem("refresh", tokens.refresh);
    }

    const finalRole = normalizeRole(data?.role);
    if (finalRole) {
      localStorage.setItem("role", finalRole);
      setRole(finalRole);
    }

    const em = (data?.email || fallbackEmail || "").trim().toLowerCase();
    if (em) {
      localStorage.setItem("email", em);
      setEmail(em);
    }

    return { ...tokens, role: finalRole, email: em };
  };

  const logout = () => {
    // Preserve logic (e.g. unread counts, last_seen) while clearing user auth
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setAccess("");
    setRole("");
    setEmail("");
  };

  // ✅ register: uses selected role
  const startRegister = async (payload) => {
    try {
      const res = await api.post("register_user/", {
        username: String(payload?.username || "").trim(),
        email: String(payload?.email || "").trim().toLowerCase(),
        password: payload?.password || "",
        address: payload?.address || "",
        phone: payload?.phone || "",
        role: normalizeRole(payload?.role) || "tenant",
      });
      return res.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  };

  const verifyOtp = async ({ email, code, purpose = "signup" }) => {
    try {
      const res = await api.post("verify-otp/", {
        email: String(email || "").trim().toLowerCase(),
        code: String(code || "").trim(),
        purpose,
      });

      // ✅ if backend returns tokens+role, store them
      if (res?.data?.access && res?.data?.role) {
        saveSession(res.data, email);
      }
      return res.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  };

  const login = async (email, password) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    try {
      const res = await api.post("login_user/", { email: cleanEmail, password });
      return saveSession(res.data, cleanEmail);
    } catch (err) {
      throw new Error(extractError(err));
    }
  };

  const value = useMemo(
    () => ({
      isAuthed,
      access,
      role,
      email,
      startRegister,
      verifyOtp,
      login,
      logout,
    }),
    [isAuthed, access, role, email, startRegister, verifyOtp, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}