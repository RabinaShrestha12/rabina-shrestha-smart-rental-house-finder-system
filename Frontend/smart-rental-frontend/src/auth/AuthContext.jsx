import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

function normalizeError(err) {
  // shows your backend message (err) if present
  const backendMsg =
    err?.response?.data?.err ||
    err?.response?.data?.detail ||
    err?.response?.data?.message;

  const status = err?.response?.status;

  if (backendMsg) return `${backendMsg}`;
  if (status) return `Request failed (status ${status}).`;
  if (err?.message) return err.message;
  return "Something went wrong.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken") || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refreshToken") || null);

  // Persist
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    else localStorage.removeItem("accessToken");
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    else localStorage.removeItem("refreshToken");
  }, [refreshToken]);

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  // Admin login
  const loginAdmin = async ({ email, password }) => {
    try {
      const res = await api.post("login/", { email, password });
      const { tokens, user } = res.data;

      setAccessToken(tokens?.access);
      setRefreshToken(tokens?.refresh);
      setUser(user);

      return user;
    } catch (err) {
      throw new Error(normalizeError(err));
    }
  };

  // Owner/Tenant login
  const loginUser = async ({ email, password }) => {
    try {
      const res = await api.post("auth/login/", { email, password });
      const { tokens, user } = res.data;

      setAccessToken(tokens?.access);
      setRefreshToken(tokens?.refresh);
      setUser(user);

      return user;
    } catch (err) {
      throw new Error(normalizeError(err));
    }
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      loginAdmin,
      loginUser,
      logout,
      isLoggedIn: !!user && !!accessToken,
    }),
    [user, accessToken, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
