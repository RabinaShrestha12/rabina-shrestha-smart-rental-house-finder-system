import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(localStorage.getItem("access") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [userId, setUserId] = useState(localStorage.getItem("user_id") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  const isAuthed = !!access;

  const saveAuth = (data) => {
    const tokens = data?.tokens || {};
    const a = tokens?.access || "";
    const r = data?.role || "";
    const e = data?.email || "";
    const id = data?.user_id != null ? String(data.user_id) : "";
    const un = data?.username || "";

    localStorage.setItem("access", a);
    localStorage.setItem("refresh", tokens?.refresh || "");
    localStorage.setItem("role", r);
    localStorage.setItem("email", e);
    if (id) localStorage.setItem("user_id", id);
    if (un) localStorage.setItem("username", un);

    setAccess(a);
    setRole(r);
    setEmail(e);
    setUserId(id);
    setUsername(un);
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");

    setAccess("");
    setRole("");
    setEmail("");
    setUserId("");
    setUsername("");
  };

  // ✅ Tenant/Owner register → backend sends OTP email
  // Backend returns: { message, email }
  const registerUser = async (payload) => {
    const body = {
      email: (payload.email || "").trim().toLowerCase(),
      password: payload.password,
      role: payload.role, // "owner" or "tenant"
      address: payload.address || "",
      phone: payload.phone || "",
      username: payload.username || payload.name || "", // you use "name" in UI
    };

    // ✅ correct endpoint
    const res = await api.post("register_user/", body);
    return res.data;
  };

  // ✅ Owner/Tenant login
  // Backend returns: { tokens, role, user_id, email, username }
  const loginUser = async (email, password) => {
    const res = await api.post("login_user/", {
      email: (email || "").trim().toLowerCase(),
      password,
    });

    if (res.status === 200 && res.data?.tokens) saveAuth(res.data);
    return res.data;
  };

  // ✅ Admin register (optional)
  const registerAdmin = async (payload) => {
    const body = {
      email: (payload.email || "").trim().toLowerCase(),
      password: payload.password,
      address: payload.address || "",
      phone: payload.phone || "",
      username: payload.username || "",
    };

    const res = await api.post("register_admin/", body);
    if (res.status === 201 && res.data?.tokens) saveAuth(res.data);
    return res.data;
  };

  // ✅ Admin login (FIXED)
  const loginAdmin = async (email, password) => {
    const res = await api.post("login_admin/", {
      email: (email || "").trim().toLowerCase(),
      password,
    });

    if (res.status === 200 && res.data?.tokens) saveAuth(res.data);
    return res.data;
  };

  // ✅ OTP verify (FIXED to match your backend)
  // Backend expects: { email, code, purpose }
  const verifyOtp = async ({ email, code, purpose = "signup" }) => {
    const res = await api.post("verify-otp/", {
      email: (email || "").trim().toLowerCase(),
      code: String(code || "").trim(),
      purpose,
    });
    return res.data;
  };

  // ❌ You do not have /resend-verification/ in your backend right now.
  // If you want resend, we can add an endpoint later.
  const resendVerification = async () => {
    throw new Error("Resend OTP endpoint is not implemented in backend yet.");
  };

  const auth = { role, email, userId, username };

  const value = useMemo(
    () => ({
      isAuthed,
      role,
      email,
      userId,
      username,
      auth,
      registerUser,
      loginUser,
      registerAdmin,
      loginAdmin,
      verifyOtp,
      resendVerification,
      logout,
    }),
    [isAuthed, role, email, userId, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
