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
    const r = role || "";
    const e = email || "";

    localStorage.setItem("access", a);
    localStorage.setItem("refresh", tokens?.refresh || "");
    localStorage.setItem("role", r);
    localStorage.setItem("email", e);

    setAccess(a);
    setRole(r);
    setEmail(e);
  };

  const logout = () => {
    // safer than localStorage.clear() if you store other app settings
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    localStorage.removeItem("email");

    setAccess("");
    setRole("");
    setEmail("");
  };

  // ✅ Tenant/Owner register
  const registerUser = async (payload) => {
    const res = await api.post("/register_user/", payload);

    // If your backend returns tokens immediately after register:
    if (res.status === 200 && res.data?.tokens) saveAuth(res.data);

    // If your backend returns OTP required after register:
    // res.status may be 202 with verification_required + otp_token
    return res.data;
  };

  // ✅ Owner/Tenant login (OTP aware)
  const loginUser = async (email, password) => {
    const res = await api.post("/login_user/", { email, password });

    // OTP required → DO NOT saveAuth (no tokens yet)
    if (res.status === 202 && res.data?.verification_required) {
      return res.data; // { verification_required, otp_token, purpose }
    }

    // Normal login (OTP disabled) → tokens + role
    if (res.status === 200 && res.data?.tokens) saveAuth(res.data);

    return res.data;
  };

  // ✅ Admin login (OTP aware)
  const loginAdmin = async (email, password) => {
    const res = await api.post("/login/", { email, password });

    if (res.status === 202 && res.data?.verification_required) {
      return res.data;
    }

    if (res.status === 200 && res.data?.tokens) saveAuth(res.data);

    return res.data;
  };

  // ✅ OTP verify = completes login (gets tokens + role)
  const verifyOtp = async ({ otp_token, code }) => {
    const res = await api.post("/verify-otp/", { otp_token, code });

    if (res.status === 200 && res.data?.tokens) {
      saveAuth(res.data);
    }

    return res.data;
  };

  // ✅ Resend OTP
  // Some backends expect { otp_token } OR { email }
  // Your Otp.jsx uses { email }, so we keep it.
  const resendVerification = async (payload) => {
    const res = await api.post("/resend-verification/", payload);
    return res.data;
  };

  const auth = { role, email };

  const value = useMemo(
    () => ({
      isAuthed,
      role,
      email,
      auth,
      registerUser,
      loginUser,
      loginAdmin,
      verifyOtp,
      resendVerification,
      logout,
    }),
    [isAuthed, role, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
