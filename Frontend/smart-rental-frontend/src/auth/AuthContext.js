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

  const registerUser = async (payload) => {
    const res = await api.post("/api/register_user/", payload);
    saveAuth(res.data);
    return res.data;
  };

  // ✅ Owner/Tenant login endpoint
  const loginUser = async (email, password) => {
    const res = await api.post("/api/login_user/", { email, password });
    saveAuth(res.data);
    return res.data;
  };

  // ✅ Admin login endpoint
  const loginAdmin = async (email, password) => {
    const res = await api.post("/api/login/", { email, password });
    saveAuth(res.data);
    return res.data;
  };

  const value = useMemo(
    () => ({ isAuthed, role, email, registerUser, loginUser, loginAdmin, logout }),
    [isAuthed, role, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
