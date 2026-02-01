// src/auth/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const normalizeError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  const backendMsg =
    data?.error ||
    data?.detail ||
    (typeof data === "string" ? data : "") ||
    "";

  if (backendMsg) return new Error(backendMsg);
  if (status) return new Error(`Request failed (status ${status}).`);
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
    const email = localStorage.getItem("email") || "";
    return { access, refresh, role, user_id, username, email };
  });

  const isAuthed = !!auth.access;

  const setSessionFromVerifyResponse = (data) => {
    // verify-otp returns: { tokens, role, user_id, email, username, email_verified }
    const access = data?.tokens?.access || "";
    const refresh = data?.tokens?.refresh || "";
    const role = data?.role || "";
    const user_id = String(data?.user_id ?? "");
    const username = data?.username || "";
    const email = data?.email || "";

    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    localStorage.setItem("role", role);
    localStorage.setItem("user_id", user_id);
    localStorage.setItem("username", username);
    localStorage.setItem("email", email);

    setAuth({ access, refresh, role, user_id, username, email });
  };

  const clearSession = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    setAuth({ access: "", refresh: "", role: "", user_id: "", username: "", email: "" });
  };

  // -----------------------
  // AUTH CALLS (start login)
  // -----------------------
  const startLoginAdmin = async ({ email, password }) => {
    try {
      const res = await api.post("login/", {
        email: (email || "").trim().toLowerCase(),
        password: password || "",
      });
      // Either {verification_required:true, otp_token,...} OR direct tokens
      return res.data;
    } catch (err) {
      throw normalizeError(err);
    }
  };

  const startLoginUser = async ({ email, password }) => {
    try {
      const res = await api.post("login_user/", {
        email: (email || "").trim().toLowerCase(),
        password: password || "",
      });
      return res.data;
    } catch (err) {
      throw normalizeError(err);
    }
  };

  const startRegisterTenant = async ({ username, email, password, address, phone }) => {
    try {
      const res = await api.post("register_user/", {
        username: (username || "").trim(),
        email: (email || "").trim().toLowerCase(),
        password: password || "",
        role: "tenant",
        address: address || "",
        phone: phone || "",
      });
      return res.data; // returns otp_token
    } catch (err) {
      throw normalizeError(err);
    }
  };

  const startRegisterAdmin = async ({ username, email, password, address, phone }) => {
    try {
      const res = await api.post("register/", {
        username: (username || "").trim(),
        email: (email || "").trim().toLowerCase(),
        password: password || "",
        address: address || "",
        phone: phone || "",
      });
      return res.data; // returns otp_token
    } catch (err) {
      throw normalizeError(err);
    }
  };

  // -----------------------
  // OTP VERIFY (final step)
  // -----------------------
  const verifyOtp = async ({ otp_token, code }) => {
    try {
      const res = await api.post("verify-otp/", {
        otp_token,
        code: String(code || "").trim(),
      });

      // ✅ after verify, now you can set session
      setSessionFromVerifyResponse(res.data);

      return res.data;
    } catch (err) {
      throw normalizeError(err);
    }
  };

  const resendVerification = async ({ email }) => {
    try {
      const res = await api.post("resend-verification/", {
        email: (email || "").trim().toLowerCase(),
      });
      return res.data;
    } catch (err) {
      throw normalizeError(err);
    }
  };

  const logout = () => clearSession();

  const value = useMemo(
    () => ({
      auth,
      isAuthed,
      startLoginAdmin,
      startLoginUser,
      startRegisterTenant,
      startRegisterAdmin,
      verifyOtp,
      resendVerification,
      logout,
    }),
    [auth, isAuthed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
