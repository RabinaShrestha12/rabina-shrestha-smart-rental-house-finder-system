// src/pages/auth/UserAuth.jsx
import React, { useMemo, useState } from "react";
import api from "../../api/axios";

function normalizeRole(r) {
  r = String(r || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  if (r === "service_provider" || r === "serviceprovider") return "provider";
  if (r === "superadmin" || r === "super_admin") return "admin";
  if (r === "user" || r === "customer") return "tenant";
  return r;
}

// ✅ when sending to backend (often backend expects service_provider, not provider)
function roleToBackend(role) {
  const r = normalizeRole(role);
  if (r === "provider") return "service_provider";
  return r;
}

function roleToPath(role) {
  const r = normalizeRole(role);
  if (r === "admin") return "/admin";
  if (r === "owner") return "/owner";
  if (r === "tenant") return "/tenant";
  if (r === "provider") return "/provider";
  return "/unauthorized";
}

function axiosMsg(err, fallback) {
  const data = err?.response?.data;
  return data?.detail || data?.message || data?.error || err?.message || fallback;
}

// ✅ extract tokens from many possible backend responses
function extractTokens(resData) {
  const access =
    resData?.access ||
    resData?.access_token ||
    resData?.tokens?.access ||
    resData?.token?.access ||
    resData?.data?.access ||
    resData?.jwt?.access ||
    "";

  const refresh =
    resData?.refresh ||
    resData?.refresh_token ||
    resData?.tokens?.refresh ||
    resData?.token?.refresh ||
    resData?.data?.refresh ||
    resData?.jwt?.refresh ||
    "";

  return { access, refresh };
}

// ✅ extract role from many possible backend responses
function extractRole(resData) {
  const raw =
    resData?.role ||
    resData?.user?.role ||
    resData?.user_type ||
    resData?.user?.user_type ||
    resData?.account_type ||
    resData?.profile?.role ||
    resData?.data?.role ||
    "";
  return normalizeRole(raw);
}

export default function UserAuth() {
  const [tab, setTab] = useState("login"); // login | register | otp | forgotRequest | forgotReset
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ LOGIN FORM (removed loginAs)
  const [lForm, setLForm] = useState({
    email: "",
    password: "",
  });

  // ✅ REGISTER FORM
  const [rForm, setRForm] = useState({
    role: "tenant",
    username: "",
    phone: "",
    address: "",
    email: "",
    password: "",
  });

  // ✅ OTP
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // ✅ FORGOT PASSWORD FORM
  const [forgotForm, setForgotForm] = useState({
    email: "",
    code: "",
    new_password: "",
    confirm_password: "",
  });

  const onChangeLogin = (e) =>
    setLForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onChangeRegister = (e) =>
    setRForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onChangeForgot = (e) =>
    setForgotForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const saveSession = (resData, email, forcedRole = "") => {
    const { access, refresh } = extractTokens(resData);
    const backendRole = extractRole(resData);
    const finalRole = normalizeRole(forcedRole || backendRole);

    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
    if (email) localStorage.setItem("email", String(email).trim().toLowerCase());
    if (finalRole) localStorage.setItem("role", finalRole);

    // ✅ helps some AuthContexts that listen to storage changes
    window.dispatchEvent(new Event("storage"));

    return { access, refresh, role: finalRole };
  };

  // ✅ REGISTER -> SEND OTP
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");

    try {
      const cleanEmail = String(rForm.email || "").trim().toLowerCase();

      await api.post("register_user/", {
        role: roleToBackend(rForm.role),
        username: String(rForm.username || "").trim(),
        phone: rForm.phone,
        address: rForm.address,
        email: cleanEmail,
        password: rForm.password,
      });

      setOtpEmail(cleanEmail);
      setOtpCode("");
      setTab("otp");
      setMsg(`OTP sent to ${cleanEmail}. Check Inbox/Spam.`);
    } catch (err) {
      setMsg(axiosMsg(err, "Register failed"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ OTP VERIFY -> back to login
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");

    try {
      const email = String(otpEmail || "").trim().toLowerCase();
      const code = String(otpCode || "").trim();

      await api.post("verify-otp/", { email, code, purpose: "signup" });

      setMsg("OTP verified ✅ Now login.");
      setTab("login");
      setLForm((p) => ({ ...p, email, password: "" }));
    } catch (err) {
      setMsg(axiosMsg(err, "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGIN -> redirect using backend role
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");

    try {
      const email = String(lForm.email || "").trim().toLowerCase();
      const password = lForm.password;

      const res = await api.post("login_user/", { email, password });

      const saved = saveSession(res.data, email);

      if (!saved.access) {
        setMsg("Login failed: access token missing. Check backend response keys.");
        setLoading(false);
        return;
      }

      if (!saved.role) {
        setMsg(
          "Login success but role missing from backend response. Please return role in login API."
        );
        setLoading(false);
        return;
      }

      window.location.href = roleToPath(saved.role);
    } catch (err) {
      const email = String(lForm.email || "").trim().toLowerCase();
      const password = lForm.password;

      try {
        const res2 = await api.post("login_admin/", { email, password });
        const saved2 = saveSession(res2.data, email, "admin");

        if (!saved2.access) {
          setMsg("Login failed: access token missing from admin login.");
          setLoading(false);
          return;
        }

        window.location.href = roleToPath(saved2.role || "admin");
      } catch (err2) {
        setMsg(axiosMsg(err2, axiosMsg(err, "Login failed")));
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ SEND RESET OTP
  const handleForgotRequestOtp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");

    try {
      const email = String(forgotForm.email || "").trim().toLowerCase();

      await api.post("request-password-reset-otp/", { email });

      setForgotForm((p) => ({
        ...p,
        email,
        code: "",
        new_password: "",
        confirm_password: "",
      }));

      setTab("forgotReset");
      setMsg(`Reset OTP sent to ${email}. Check Inbox/Spam.`);
    } catch (err) {
      setMsg(axiosMsg(err, "Failed to send reset OTP"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ RESET PASSWORD
  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");

    try {
      const email = String(forgotForm.email || "").trim().toLowerCase();
      const code = String(forgotForm.code || "").trim();
      const new_password = forgotForm.new_password;
      const confirm_password = forgotForm.confirm_password;

      if (!email || !code || !new_password || !confirm_password) {
        setMsg("Please fill all fields.");
        setLoading(false);
        return;
      }

      if (new_password !== confirm_password) {
        setMsg("New password and confirm password do not match.");
        setLoading(false);
        return;
      }

      await api.post("reset-password/", {
        email,
        code,
        new_password,
      });

      setMsg("Password reset successful. Now login with your new password.");
      setTab("login");
      setLForm((p) => ({ ...p, email, password: "" }));
      setForgotForm({
        email: "",
        code: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      setMsg(axiosMsg(err, "Password reset failed"));
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(
    () => ({
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
        width: "min(760px, 96vw)",
        borderRadius: 26,
        padding: 22,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
      },
      header: { display: "flex", gap: 14, alignItems: "center", marginBottom: 14 },
      logo: {
        width: 44,
        height: 44,
        borderRadius: 14,
        background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
      },
      title: { fontSize: 22, fontWeight: 900, lineHeight: 1.1 },
      subtitle: { opacity: 0.8, marginTop: 4, fontSize: 13 },
      tabs: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginTop: 10,
        marginBottom: 14,
        background: "rgba(255,255,255,0.05)",
        padding: 10,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
      },
      tabBtn: {
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "white",
        cursor: "pointer",
        fontWeight: 900,
      },
      tabActive: {
        background: "rgba(124,58,237,0.35)",
        border: "1px solid rgba(124,58,237,0.55)",
      },
      form: {
        marginTop: 6,
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.12)",
      },
      h3: { fontSize: 16, fontWeight: 900, marginBottom: 10 },
      label: { fontSize: 12, opacity: 0.85, marginBottom: 6, marginTop: 10 },
      input: {
        width: "100%",
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        outline: "none",
      },
      select: {
        width: "100%",
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg,#4c1d95,#1e1b4b)",
        color: "white",
        outline: "none",
      },
      grid2: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginTop: 8,
      },
      btn: {
        width: "100%",
        marginTop: 14,
        padding: 14,
        borderRadius: 16,
        border: "none",
        background: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
        color: "white",
        fontWeight: 900,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.85 : 1,
      },
      forgotBtn: {
        marginTop: 12,
        background: "transparent",
        border: "none",
        color: "#d8b4fe",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        padding: 0,
      },
      backBtn: {
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "transparent",
        color: "white",
        cursor: "pointer",
        fontWeight: 700,
      },
      msg: { marginTop: 12, color: "#ffb4b4", fontWeight: 900, fontSize: 13 },
      ok: { marginTop: 12, color: "#b7ffcf", fontWeight: 900, fontSize: 13 },
    }),
    [loading]
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo} />
          <div>
            <div style={styles.title}>Smart Rental System</div>
            <div style={styles.subtitle}>Login/Register and go to your dashboard.</div>
          </div>
        </div>

        {(tab === "login" || tab === "register") && (
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setMsg("");
              }}
              style={{ ...styles.tabBtn, ...(tab === "login" ? styles.tabActive : {}) }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setMsg("");
              }}
              style={{ ...styles.tabBtn, ...(tab === "register" ? styles.tabActive : {}) }}
            >
              Register
            </button>
          </div>
        )}

        {/* REGISTER */}
        {tab === "register" && (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.h3}>Create account</div>

            <div style={styles.label}>Register as</div>
            <select
              name="role"
              value={rForm.role}
              onChange={onChangeRegister}
              style={styles.select}
            >
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="provider">Service Provider</option>
            </select>

            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>Username</div>
                <input
                  name="username"
                  value={rForm.username}
                  onChange={onChangeRegister}
                  style={styles.input}
                  required
                />
              </div>
              <div>
                <div style={styles.label}>Phone</div>
                <input
                  name="phone"
                  value={rForm.phone}
                  onChange={onChangeRegister}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.label}>Address</div>
            <input
              name="address"
              value={rForm.address}
              onChange={onChangeRegister}
              style={styles.input}
            />

            <div style={styles.label}>Email</div>
            <input
              name="email"
              value={rForm.email}
              onChange={onChangeRegister}
              style={styles.input}
              required
            />

            <div style={styles.label}>Password</div>
            <input
              name="password"
              type="password"
              value={rForm.password}
              onChange={onChangeRegister}
              style={styles.input}
              required
            />

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Please wait..." : "Create account"}
            </button>
          </form>
        )}

        {/* OTP */}
        {tab === "otp" && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div style={styles.h3}>Verify OTP</div>

            <div style={styles.label}>Email</div>
            <input value={otpEmail} readOnly style={styles.input} />

            <div style={styles.label}>OTP Code</div>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              style={styles.input}
            />

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("login");
                setMsg("");
              }}
              style={styles.backBtn}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* LOGIN */}
        {tab === "login" && (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.h3}>Login</div>

            <div style={styles.label}>Email</div>
            <input
              name="email"
              value={lForm.email}
              onChange={onChangeLogin}
              style={styles.input}
              required
            />

            <div style={styles.label}>Password</div>
            <input
              name="password"
              type="password"
              value={lForm.password}
              onChange={onChangeLogin}
              style={styles.input}
              required
            />

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Please wait..." : "Login"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotForm((p) => ({
                  ...p,
                  email: String(lForm.email || "").trim().toLowerCase(),
                }));
                setTab("forgotRequest");
                setMsg("");
              }}
              style={styles.forgotBtn}
            >
              Forgot Password?
            </button>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              * Role will be detected automatically from backend.
            </div>
          </form>
        )}

        {/* FORGOT REQUEST */}
        {tab === "forgotRequest" && (
          <form onSubmit={handleForgotRequestOtp} style={styles.form}>
            <div style={styles.h3}>Forgot Password</div>

            <div style={styles.label}>Email</div>
            <input
              name="email"
              value={forgotForm.email}
              onChange={onChangeForgot}
              style={styles.input}
              required
            />

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Sending OTP..." : "Send Reset OTP"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("login");
                setMsg("");
              }}
              style={styles.backBtn}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* FORGOT RESET */}
        {tab === "forgotReset" && (
          <form onSubmit={handleForgotResetPassword} style={styles.form}>
            <div style={styles.h3}>Reset Password</div>

            <div style={styles.label}>Email</div>
            <input
              name="email"
              value={forgotForm.email}
              onChange={onChangeForgot}
              style={styles.input}
              required
            />

            <div style={styles.label}>OTP Code</div>
            <input
              name="code"
              value={forgotForm.code}
              onChange={onChangeForgot}
              style={styles.input}
              required
            />

            <div style={styles.label}>New Password</div>
            <input
              name="new_password"
              type="password"
              value={forgotForm.new_password}
              onChange={onChangeForgot}
              style={styles.input}
              required
            />

            <div style={styles.label}>Confirm New Password</div>
            <input
              name="confirm_password"
              type="password"
              value={forgotForm.confirm_password}
              onChange={onChangeForgot}
              style={styles.input}
              required
            />

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("forgotRequest");
                setMsg("");
              }}
              style={styles.backBtn}
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