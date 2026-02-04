import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();

  // ✅ IMPORTANT:
  // Your AuthContext must call Django endpoints:
  // startRegisterTenant -> POST register_user/
  // verifyOtp -> POST verify-otp/
  // resendVerification -> POST register_user/ (same email) OR POST resend endpoint if you created one
  const { startRegisterTenant, verifyOtp, resendVerification } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    address: "",
    phone: "",
    role: "tenant", // ✅ add role because backend requires role: owner/tenant
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ OTP state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ✅ Register (step 1)
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");

    try {
      const cleanEmail = form.email.trim().toLowerCase();

      const res = await startRegisterTenant({
        username: form.username,
        email: cleanEmail,
        password: form.password,
        address: form.address,
        phone: form.phone,
        role: form.role, // ✅ required by backend
      });

      // ✅ Save email for OTP screen
      sessionStorage.setItem("otp_email", cleanEmail);

      // ✅ Open OTP UI always after register (because your backend sends OTP)
      setOtpOpen(true);
      setMsg(res?.message || `OTP has been sent to ${cleanEmail}. Check Inbox/Spam.`);
    } catch (err) {
      setMsg(err?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verify OTP (step 2) - email + code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const email = form.email.trim().toLowerCase();
    const code = otpCode.trim();

    if (!email) {
      setMsg("Email missing. Please register again.");
      return;
    }
    if (!code) {
      setMsg("Please enter the OTP code.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      await verifyOtp({
        email,
        code,
        purpose: "signup",
      });

      setOtpOpen(false);
      setOtpCode("");
      sessionStorage.removeItem("otp_email");

      setMsg("OTP verified! You can login now.");
      nav("/auth", { replace: true }); // ✅ go to login page
    } catch (err) {
      setMsg(err?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend OTP (your backend resends if pending signup exists)
  const handleResend = async () => {
    try {
      const cleanEmail = form.email.trim().toLowerCase();

      await resendVerification({
        username: form.username,
        email: cleanEmail,
        password: form.password,
        address: form.address,
        phone: form.phone,
        role: form.role,
      });

      setMsg(`OTP resent to ${cleanEmail}. Please use the latest OTP.`);
    } catch (err) {
      setMsg(err?.message || "Resend failed");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h2>Register</h2>

      {!otpOpen ? (
        <form onSubmit={handleRegister}>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={onChange}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <input
            name="password"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={onChange}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <select
            name="role"
            value={form.role}
            onChange={onChange}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          >
            <option value="tenant">Tenant</option>
            <option value="owner">Owner</option>
          </select>

          <input
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={onChange}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <input
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={onChange}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
            {loading ? "Please wait..." : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <h3>Enter OTP</h3>
          <p style={{ opacity: 0.8 }}>
            We sent a code to: <b>{form.email}</b> (check Inbox/Spam)
          </p>

          <input
            placeholder="6-digit OTP"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button type="button" onClick={handleResend} style={{ width: "100%", padding: 10, marginTop: 8 }}>
            Resend OTP
          </button>

          <button type="button" onClick={() => setOtpOpen(false)} style={{ width: "100%", padding: 10, marginTop: 8 }}>
            Back
          </button>
        </form>
      )}

      {msg ? <div style={{ marginTop: 12, color: "tomato" }}>{msg}</div> : null}
    </div>
  );
}
