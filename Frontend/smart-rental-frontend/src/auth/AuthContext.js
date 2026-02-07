// src/auth/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

function normalizeRole(raw) {
  const r = String(raw || "").trim().toLowerCase();
  if (!r) return "";

  if (r === "admin" || r.includes("super") || r.includes("staff")) return "admin";
  if (r.includes("provider") || r.includes("service")) return "provider";
  if (r.includes("owner") || r.includes("landlord")) return "owner";
  if (r.includes("tenant") || r.includes("renter") || r.includes("user")) return "tenant";

  return r;
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function extractTokens(data) {
  return {
    access: data?.access || data?.access_token || data?.tokens?.access || "",
    refresh: data?.refresh || data?.refresh_token || data?.tokens?.refresh || "",
  };
}

function extractRole(data, accessToken) {
  const raw =
    data?.role ||
    data?.user_type ||
    data?.user?.role ||
    data?.user?.user_type ||
    "";

  let role = normalizeRole(raw);

  if (!role && accessToken) {
    const payload = decodeJwtPayload(accessToken);
    const claimRole =
      payload?.role || payload?.user_type || payload?.account_type || payload?.type || "";
    const isStaff = payload?.is_staff || payload?.is_superuser;
    role = isStaff ? "admin" : normalizeRole(claimRole);
  }

  return role;
}

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(
    localStorage.getItem("access") || localStorage.getItem("access_token") || ""
  );
  const [role, setRole] = useState(normalizeRole(localStorage.getItem("role") || ""));
  const [email, setEmail] = useState(localStorage.getItem("email") || "");

  const isAuthed = !!access;

  const saveSession = (data, fallbackEmail = "") => {
    const tokens = extractTokens(data);

    if (tokens.access) {
      localStorage.setItem("access", tokens.access);
      localStorage.setItem("access_token", tokens.access);
      setAccess(tokens.access);
    }

    if (tokens.refresh) {
      localStorage.setItem("refresh", tokens.refresh);
      localStorage.setItem("refresh_token", tokens.refresh);
    }

    const finalRole = extractRole(data, tokens.access);
    if (finalRole) {
      localStorage.setItem("role", finalRole);
      setRole(finalRole);
    }

    const em = (data?.email || data?.user?.email || fallbackEmail || "").trim().toLowerCase();
    if (em) {
      localStorage.setItem("email", em);
      setEmail(em);
    }

    return { ...tokens, role: finalRole, email: em };
  };

  const logout = (redirectTo = "/") => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    setAccess("");
    setRole("");
    setEmail("");
    window.location.href = redirectTo;
  };

  // ✅ ONE login for all:
  // tries admin login first; if fails -> user login
  const login = async (email, password) => {
    const cleanEmail = String(email || "").trim().toLowerCase();

    try {
      const res = await api.post("login_admin/", { email: cleanEmail, password });
      return saveSession({ ...res.data, role: res.data?.role || "admin" }, cleanEmail);
    } catch (e) {
      const res2 = await api.post("login_user/", { email: cleanEmail, password });
      return saveSession(res2.data, cleanEmail);
    }
  };

  const value = useMemo(
    () => ({ isAuthed, access, role, email, login, logout }),
    [isAuthed, access, role, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
