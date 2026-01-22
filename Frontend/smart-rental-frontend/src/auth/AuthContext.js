import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(localStorage.getItem("access") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");

  const isAuthed = !!access;

  const saveAuth = ({ tokens, role, email }) => {
    const a = tokens?.access || "";

    localStorage.setItem("access", a);
    localStorage.setItem("role", role || "");
    localStorage.setItem("email", email || "");

    setAccess(a);
    setRole(role || "");
    setEmail(email || "");
  };

  const logout = () => {
    localStorage.clear();
    setAccess("");
    setRole("");
    setEmail("");
  };

  // ✅ Register (Owner/Tenant)
  const registerUser = async (payload) => {
    // baseURL already has /api, so DO NOT add /api here
    const res = await api.post("/register_user/", payload);
    saveAuth(res.data);
    return res.data;
  };

  // ✅ Owner/Tenant login
  const loginUser = async (email, password) => {
    const res = await api.post("/login_user/", { email, password });
    saveAuth(res.data);
    return res.data;
  };

  // ✅ Admin login
  // Your Django shows you have /api/login/ available
  const loginAdmin = async (email, password) => {
    const res = await api.post("/login/", { email, password });
    saveAuth(res.data);
    return res.data;
  };

  const value = useMemo(
    () => ({
      isAuthed,
      role,
      email,
      registerUser,
      loginUser,
      loginAdmin,
      logout,
    }),
    [isAuthed, role, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
