import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const { startRegisterTenant, verifyOtp, resendVerification } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ OTP state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpToken, setOtpToken] = useState("");
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
      const res = await startRegisterTenant({
        username: form.username,
        email: form.email,
        password: form.password,
        address: form.address,
        phone: form.phone,
      });

      // ✅ backend returns otp_token here
      if (res?.verification_required && res?.otp_token) {
        setOtpToken(res.otp_token);
        setOtpOpen(true);
        setMsg(res.message || "OTP sent. Please enter it.");
        return;
      }

      setMsg("Registered successfully (no OTP required).");
    } catch (err) {
      setMsg(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verify OTP (step 2)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpToken) {
      setMsg("Missing otp_token. Please register again.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await verifyOtp({ otp_token: otpToken, code: otpCode });

      // ✅ verifyOtp already saved tokens to localStorage
      setOtpOpen(false);
      setOtpToken("");
      setOtpCode("");

      setMsg("OTP verified! Account created and logged in.");
      nav("/", { replace: true });
    } catch (err) {
      setMsg(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification({ email: form.email });
      setMsg("OTP resent. Use the latest OTP code.");
    } catch (err) {
      setMsg(err.message || "Resend failed");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h2>Register</h2>

      {!otpOpen ? (
        <form onSubmit={handleRegister}>
          <input name="username" placeholder="Username" value={form.username} onChange={onChange} style={{ width: "100%", padding: 10, marginBottom: 10 }} />
          <input name="email" placeholder="Email" value={form.email} onChange={onChange} style={{ width: "100%", padding: 10, marginBottom: 10 }} />
          <input name="password" placeholder="Password" type="password" value={form.password} onChange={onChange} style={{ width: "100%", padding: 10, marginBottom: 10 }} />
          <input name="address" placeholder="Address" value={form.address} onChange={onChange} style={{ width: "100%", padding: 10, marginBottom: 10 }} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={onChange} style={{ width: "100%", padding: 10, marginBottom: 10 }} />

          <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
            {loading ? "Please wait..." : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <h3>Enter OTP</h3>
          <p style={{ opacity: 0.8 }}>We sent a code to: <b>{form.email}</b></p>

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
