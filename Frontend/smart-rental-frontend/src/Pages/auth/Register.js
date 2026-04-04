import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import "./UserAuth.css";

export default function Register() {
  const nav = useNavigate();
  const { startRegister, verifyOtp } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === "dark";

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

  const normalizeRole = (r) => {
    const role = String(r || "").trim().toLowerCase();
    if (["tenant", "owner", "provider"].includes(role)) return role;
    if (["service_provider", "service provider", "service-provider"].includes(role)) {
      return "provider";
    }
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

  const styles = getStyles(isDark);

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.card}>
        <h2 style={styles.heading}>Create account</h2>

        {!otpOpen ? (
          <form onSubmit={handleRegister}>
            <label style={styles.label}>Register as</label>

            <div className={`selectWrap ${isDark ? "dark" : "light"}`}>
              <select
                name="role"
                value={form.role}
                onChange={onChange}
                className={`roleSelect ${isDark ? "dark" : "light"}`}
              >
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
                <option value="provider">Service Provider</option>
              </select>
              <span className={`selectArrow ${isDark ? "dark" : "light"}`}>▾</span>
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
            <h3 style={styles.subHeading}>Enter OTP</h3>
            <p style={styles.otpText}>
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

            <button
              type="button"
              onClick={() => setOtpOpen(false)}
              style={styles.secondaryBtn}
            >
              Back
            </button>
          </form>
        )}

        {msg ? <div style={styles.msg}>{msg}</div> : null}
      </div>
    </div>
  );
}

function getStyles(isDark) {
  return {
    page: {
      minHeight: "100vh",
      width: "100%",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
      background: isDark
        ? "linear-gradient(135deg, #071224 0%, #0b1f3a 45%, #123765 100%)"
        : "linear-gradient(135deg, #f8fbff 0%, #eef4ff 45%, #dbeafe 100%)",
      color: isDark ? "#ffffff" : "#0f172a",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      transition: "all 0.3s ease",
    },

    overlay: {
      position: "absolute",
      inset: 0,
      background: isDark
        ? "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(96,165,250,0.12), transparent 28%)"
        : "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 30%), radial-gradient(circle at bottom right, rgba(59,130,246,0.10), transparent 28%)",
      pointerEvents: "none",
    },

    card: {
      position: "relative",
      zIndex: 1,
      width: "min(520px, 96vw)",
      borderRadius: "24px",
      padding: "26px",
      background: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.90)",
      border: isDark
        ? "1px solid rgba(148, 163, 184, 0.18)"
        : "1px solid rgba(148, 163, 184, 0.24)",
      boxShadow: isDark
        ? "0 24px 70px rgba(0,0,0,0.45)"
        : "0 18px 45px rgba(37,99,235,0.12)",
      backdropFilter: "blur(16px)",
      transition: "all 0.3s ease",
    },

    heading: {
      marginTop: 0,
      marginBottom: "12px",
      fontSize: "30px",
      fontWeight: 800,
      color: isDark ? "#ffffff" : "#0f172a",
    },

    subHeading: {
      marginTop: 0,
      marginBottom: "10px",
      fontSize: "24px",
      fontWeight: 800,
      color: isDark ? "#ffffff" : "#0f172a",
    },

    otpText: {
      opacity: 0.92,
      color: isDark ? "#dbeafe" : "#334155",
      marginBottom: "14px",
    },

    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: "7px",
      marginTop: "12px",
      color: isDark ? "#cbd5e1" : "#475569",
    },

    input: {
      width: "100%",
      padding: "13px 14px",
      marginBottom: "12px",
      borderRadius: "14px",
      border: isDark
        ? "1px solid rgba(148, 163, 184, 0.16)"
        : "1px solid rgba(203, 213, 225, 1)",
      background: isDark ? "rgba(30, 41, 59, 0.82)" : "#f8fafc",
      color: isDark ? "#ffffff" : "#0f172a",
      outline: "none",
      fontSize: "15px",
      transition: "all 0.25s ease",
      boxSizing: "border-box",
    },

    primaryBtn: {
      width: "100%",
      padding: "14px",
      borderRadius: "16px",
      border: "none",
      background: "linear-gradient(135deg, #2563eb, #3b82f6)",
      color: "#ffffff",
      fontWeight: 800,
      fontSize: "15px",
      cursor: "pointer",
      marginTop: "8px",
      boxShadow: "0 12px 24px rgba(37,99,235,0.22)",
      transition: "all 0.25s ease",
    },

    secondaryBtn: {
      width: "100%",
      padding: "13px",
      borderRadius: "16px",
      border: isDark
        ? "1px solid rgba(148, 163, 184, 0.18)"
        : "1px solid rgba(203, 213, 225, 1)",
      background: isDark ? "rgba(30, 41, 59, 0.70)" : "#ffffff",
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontWeight: 700,
      fontSize: "15px",
      cursor: "pointer",
      marginTop: "10px",
      transition: "all 0.25s ease",
    },

    msg: {
      marginTop: "14px",
      color: isDark ? "#fca5a5" : "#dc2626",
      fontWeight: 700,
      fontSize: "14px",
    },
  };
}