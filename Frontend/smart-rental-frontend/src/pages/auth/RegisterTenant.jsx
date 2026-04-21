import React, { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import OtpModal from "./OtpModal";

export default function RegisterTenant() {
  const nav = useNavigate();
  const { verifyOtp, resendVerification } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [otpPurpose, setOtpPurpose] = useState("signup");

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const openOtp = (data) => {
    setOtpToken(data?.otp_token || "");
    setOtpPurpose(data?.purpose || "signup");
    setOtpOpen(true);
  };

  const closeOtp = () => {
    setOtpOpen(false);
    setOtpToken("");
    setOtpPurpose("signup");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");
    setErrMsg("");

    try {
      const res = await api.post("/register_user/", {
        username: (form.username || "").trim(),
        email: (form.email || "").trim().toLowerCase(),
        password: form.password || "",
        role: "tenant",
        address: form.address || "",
        phone: form.phone || "",
      });

      if (res?.data?.verification_required && res?.data?.otp_token) {
        setMsg(res.data.message || "OTP sent. Please verify.");
        openOtp(res.data);
        return;
      }

      setMsg("Registered successfully. Please login.");
      nav("/auth", { replace: true });
    } catch (err) {
      const m =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Register failed";
      setErrMsg(String(m));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    if (!otpToken) {
      setErrMsg("Missing otp_token. Please register again.");
      return;
    }

    setLoading(true);
    setErrMsg("");

    try {
      const res = await verifyOtp({ otp_token: otpToken, code });
      closeOtp();

      const role = (res?.role || "").toLowerCase();
      if (role === "tenant") nav("/tenant", { replace: true });
      else if (role === "owner") nav("/owner", { replace: true });
      else if (role === "admin") nav("/admin", { replace: true });
      else nav("/", { replace: true });
    } catch (err) {
      const m =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "OTP verification failed";
      setErrMsg(String(m));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification({ email: form.email });
      setMsg("OTP resent. Use the latest OTP code.");
    } catch (err) {
      setErrMsg(err?.message || "Resend failed");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Register Tenant</h2>

      <form onSubmit={handleRegister}>
        <input name="username" value={form.username} onChange={onChange} placeholder="Name" style={iStyle} />
        <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" style={iStyle} />
        <input name="address" value={form.address} onChange={onChange} placeholder="Address" style={iStyle} />
        <input name="email" value={form.email} onChange={onChange} placeholder="Email" style={iStyle} />
        <input name="password" value={form.password} onChange={onChange} placeholder="Password" type="password" style={iStyle} />

        <button type="submit" disabled={loading} style={bStyle}>
          {loading ? "Please wait..." : "Create tenant account"}
        </button>
      </form>

      {msg ? <div style={{ marginTop: 10, color: "#b8ffb8" }}>{msg}</div> : null}
      {errMsg ? <div style={{ marginTop: 10, color: "#ff8a8a" }}>{errMsg}</div> : null}

      <OtpModal
        open={otpOpen}
        purpose={otpPurpose}
        email={form.email}
        loading={loading}
        error={errMsg}
        onVerify={handleVerify}
        onResend={handleResend}
        onClose={closeOtp}
      />
    </div>
  );
}

const iStyle = { width: "100%", padding: 10, marginBottom: 10, borderRadius: 10 };

const bStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "none",
  background: "#6d5efc",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};
