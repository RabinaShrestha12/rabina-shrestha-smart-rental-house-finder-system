// src/pages/auth/RegisterProvider.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function RegisterProvider() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    username: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    role: "provider", // ✅ fixed
  });

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ✅ Step 1: Register -> sends OTP
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");

    try {
      const cleanEmail = form.email.trim().toLowerCase();

      const res = await api.post("register_user/", {
        username: form.username.trim(),
        email: cleanEmail,
        password: form.password,
        address: form.address,
        phone: form.phone,
        role: "provider",
      });

      sessionStorage.setItem("otp_email", cleanEmail);
      setOtpOpen(true);

      setMsg(res?.data?.message || `OTP sent to ${cleanEmail}. Check Inbox/Spam.`);
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = (sessionStorage.getItem("otp_email") || form.email).trim().toLowerCase();
    const code = otpCode.trim();

    if (!code) {
      setMsg("Please enter the OTP code.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      await api.post("verify-otp/", {
        email,
        code,
        purpose: "signup",
      });

      sessionStorage.removeItem("otp_email");
      setOtpOpen(false);
      setOtpCode("");

      setMsg("OTP verified! You can login now.");
      nav("/auth", { replace: true });
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend OTP (your backend resends using register_user again)
  const handleResend = async () => {
    try {
      const cleanEmail = (sessionStorage.getItem("otp_email") || form.email).trim().toLowerCase();

      await api.post("register_user/", {
        username: form.username.trim(),
        email: cleanEmail,
        password: form.password,
        address: form.address,
        phone: form.phone,
        role: "provider",
      });

      setMsg(`OTP resent to ${cleanEmail}. Please use the latest OTP.`);
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.response?.data?.message || "Resend failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Register Service Provider</h2>

        {!otpOpen ? (
          <form onSubmit={handleRegister}>
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={onChange}
              style={styles.input}
              required
            />

            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={onChange}
              style={styles.input}
            />

            <input
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={onChange}
              style={styles.input}
            />

            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              style={styles.input}
              required
            />

            <input
              name="password"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={onChange}
              style={styles.input}
              required
            />

            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading ? "Please wait..." : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => nav("/auth")}
              style={styles.secondaryBtn}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <h3 style={{ marginTop: 0 }}>Enter OTP</h3>

            <p style={{ opacity: 0.85 }}>
              We sent a code to <b>{(sessionStorage.getItem("otp_email") || form.email).trim()}</b>
            </p>

            <input
              placeholder="6-digit OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button type="button" onClick={handleResend} style={styles.secondaryBtn}>
              Resend OTP
            </button>

            <button type="button" onClick={() => setOtpOpen(false)} style={styles.secondaryBtn}>
              Back
            </button>
          </form>
        )}

        {msg ? <div style={styles.msg}>{msg}</div> : null}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "radial-gradient(circle at 30% 10%, #4c1d95 0%, #0b1020 55%, #020617 100%)",
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  card: {
    width: "min(520px, 96vw)",
    borderRadius: 22,
    padding: 22,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },
  primaryBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 6,
  },
  secondaryBtn: {
    width: "100%",
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 10,
  },
  msg: { marginTop: 12, color: "#ffb4b4", fontWeight: 700 },
};
