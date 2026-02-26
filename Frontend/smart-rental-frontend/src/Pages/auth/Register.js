import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

// ✅ IMPORTANT: import your css here
import "./UserAuth.css";

export default function Register() {
  const nav = useNavigate();
  const { startRegister, verifyOtp } = useAuth();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    username: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    role: "tenant",
  });

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // ✅ frontend normalize (only for service_provider -> provider safety)
  const normalizeRole = (r) => {
    const role = String(r || "").trim().toLowerCase();
    if (["tenant", "owner", "provider"].includes(role)) return role;
    if (["service_provider", "service provider", "service-provider"].includes(role))
      return "provider";
    return "tenant";
  };

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");

    try {
      const cleanEmail = String(form.email || "").trim().toLowerCase();
      const roleToSend = normalizeRole(form.role);

      const res = await startRegister({
        username: String(form.username || "").trim(),
        email: cleanEmail,
        password: form.password || "",
        address: form.address || "",
        phone: form.phone || "",
        role: roleToSend,
      });

      sessionStorage.setItem("otp_email", cleanEmail);
      sessionStorage.setItem("otp_role", roleToSend);
      setOtpOpen(true);

      setMsg(res?.message || `OTP sent to ${cleanEmail}. Check Inbox/Spam.`);
    } catch (err) {
      setMsg(err?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = (sessionStorage.getItem("otp_email") || form.email || "")
      .trim()
      .toLowerCase();

    const code = String(otpCode || "").trim();

    if (!email) return setMsg("Email missing. Please register again.");
    if (!code) return setMsg("Please enter the OTP code.");

    setLoading(true);
    setMsg("");

    try {
      const data = await verifyOtp({ email, code, purpose: "signup" });

      sessionStorage.removeItem("otp_email");
      sessionStorage.removeItem("otp_role");

      setOtpOpen(false);
      setOtpCode("");

      const finalRole = (data?.role || "").toLowerCase();

      setMsg("OTP verified! Redirecting...");
      if (finalRole === "owner") nav("/owner", { replace: true });
      else if (finalRole === "provider") nav("/provider", { replace: true });
      else nav("/tenant", { replace: true });
    } catch (err) {
      setMsg(err?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Create account</h2>

        {!otpOpen ? (
          <form onSubmit={handleRegister}>
            <label style={styles.label}>Register as</label>

            {/* ✅ COLORFUL DROPDOWN */}
            <div className="selectWrap">
              <select
                name="role"
                value={form.role}
                onChange={onChange}
                className="roleSelect"
              >
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
                <option value="provider">Service Provider</option>
              </select>

              {/* ✅ custom arrow */}
              <span className="selectArrow">▾</span>
            </div>

            <label style={styles.label}>Username</label>
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={onChange}
              style={styles.input}
              required
            />

            <label style={styles.label}>Phone</label>
            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={onChange}
              style={styles.input}
            />

            <label style={styles.label}>Address</label>
            <input
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={onChange}
              style={styles.input}
            />

            <label style={styles.label}>Email</label>
            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              style={styles.input}
              required
            />

            <label style={styles.label}>Password</label>
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

            <button type="button" onClick={() => nav("/auth")} style={styles.secondaryBtn}>
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <h3 style={{ marginTop: 0 }}>Enter OTP</h3>
            <p style={{ opacity: 0.85 }}>
              We sent a code to{" "}
              <b>{(sessionStorage.getItem("otp_email") || form.email || "").trim()}</b>
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
    background:
      "radial-gradient(circle at 30% 10%, #4c1d95 0%, #0b1020 55%, #020617 100%)",
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
  label: {
    display: "block",
    fontSize: 12,
    opacity: 0.85,
    marginBottom: 6,
    marginTop: 10,
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