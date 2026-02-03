import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./UserAuth.css";

export default function UserAuth() {
  const navigate = useNavigate();
  const { loginUser, loginAdmin, registerUser } = useAuth();

  const [tab, setTab] = useState("login"); // login | register
  const [loginType, setLoginType] = useState("user"); // user | admin
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // login fields
  const [log, setLog] = useState({ email: "", password: "" });

  // register fields
  const [reg, setReg] = useState({
    role: "tenant",
    username: "",   // ✅ use username (backend field)
    address: "",
    phone: "",
    email: "",
    password: "",
  });

  const onLogChange = (e) => setLog({ ...log, [e.target.name]: e.target.value });
  const onRegChange = (e) => setReg({ ...reg, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const data =
        loginType === "admin"
          ? await loginAdmin(log.email, log.password)
          : await loginUser(log.email, log.password);

      // ✅ redirect must match App.js: /owner /tenant /admin
      if (data.role === "admin") navigate("/admin");
      else if (data.role === "owner") navigate("/owner");
      else if (data.role === "tenant") navigate("/tenant");
      else navigate("/");

      setMsg("✅ Login successful. Redirecting…");
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data || err.message);
      setMsg("❌ Login failed: " + detail);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      // ✅ register API call (backend sends OTP)
      await registerUser(reg);

      // ✅ save email for OTP page autofill
      sessionStorage.setItem("otp_email", (reg.email || "").trim().toLowerCase());

      setMsg("✅ Registered. OTP sent to your email. Please verify OTP.");

      // ✅ go to OTP page after register
      navigate("/otp", { replace: true });
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data || err.message);
      setMsg("❌ Register failed: " + detail);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-header">
          <div className="brand">
            <div className="logo-badge" />
            <div>
              <h1>Smart Rental System</h1>
              <p>Login/Register and go to your role-based dashboard.</p>
            </div>
          </div>

          <div className="badge-row">
            <div className="badge">JWT Auth</div>
            <div className="badge">Role Based</div>
            <div className="badge">Owner • Tenant • Admin</div>
          </div>
        </div>

        <div className="auth-grid">
          {/* LEFT */}
          <div className="card">
            <div className="tabs">
              <button
                className={`tab ${tab === "login" ? "active" : ""}`}
                type="button"
                onClick={() => setTab("login")}
              >
                Login
              </button>
              <button
                className={`tab ${tab === "register" ? "active" : ""}`}
                type="button"
                onClick={() => setTab("register")}
              >
                Register
              </button>
            </div>

            {tab === "login" ? (
              <form onSubmit={handleLogin}>
                <div className="section-title">
                  <h3>Choose account type</h3>
                  <span className="hint">Use your email + password</span>
                </div>

                <div className="role-chips">
                  <label className="chip">
                    <input
                      type="radio"
                      name="loginType"
                      value="user"
                      checked={loginType === "user"}
                      onChange={() => setLoginType("user")}
                    />
                    Owner / Tenant
                  </label>

                  <label className="chip">
                    <input
                      type="radio"
                      name="loginType"
                      value="admin"
                      checked={loginType === "admin"}
                      onChange={() => setLoginType("admin")}
                    />
                    Admin
                  </label>
                </div>

                <div className="field">
                  <div className="label">Email</div>
                  <div className="input-wrap">
                    <span className="icon">✉️</span>
                    <input
                      className="input"
                      name="email"
                      placeholder="you@example.com"
                      value={log.email}
                      onChange={onLogChange}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <div className="label">Password</div>
                  <div className="input-wrap">
                    <span className="icon">🔒</span>
                    <input
                      className="input"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={log.password}
                      onChange={onLogChange}
                      required
                    />
                  </div>
                </div>

                <button className="btn" type="submit">
                  {loginType === "admin"
                    ? "Login as Admin"
                    : "Login as Owner/Tenant"}
                </button>

                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                >
                  {showPwd ? "Hide password" : "Show password"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="section-title">
                  <h3>Create owner/tenant account</h3>
                  <span className="hint">Role + basic details</span>
                </div>

                <div className="field">
                  <div className="label">Register as</div>
                  <select
                    className="select"
                    name="role"
                    value={reg.role}
                    onChange={onRegChange}
                  >
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <div className="row-2">
                  <div className="field">
                    <div className="label">Username</div>
                    <div className="input-wrap">
                      <span className="icon">👤</span>
                      <input
                        className="input"
                        name="username"
                        placeholder="e.g. kechan123"
                        value={reg.username}
                        onChange={onRegChange}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <div className="label">Phone</div>
                    <div className="input-wrap">
                      <span className="icon">📞</span>
                      <input
                        className="input"
                        name="phone"
                        placeholder="Phone number"
                        value={reg.phone}
                        onChange={onRegChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <div className="label">Address</div>
                  <input
                    className="input"
                    style={{ paddingLeft: 12 }}
                    name="address"
                    placeholder="Address"
                    value={reg.address}
                    onChange={onRegChange}
                  />
                </div>

                <div className="field">
                  <div className="label">Email</div>
                  <div className="input-wrap">
                    <span className="icon">✉️</span>
                    <input
                      className="input"
                      name="email"
                      placeholder="you@example.com"
                      value={reg.email}
                      onChange={onRegChange}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <div className="label">Password</div>
                  <div className="input-wrap">
                    <span className="icon">🔒</span>
                    <input
                      className="input"
                      name="password"
                      type="password"
                      placeholder="Create password"
                      value={reg.password}
                      onChange={onRegChange}
                      required
                    />
                  </div>
                </div>

                <button className="btn" type="submit">
                  Create account
                </button>
              </form>
            )}

            {msg && (
              <div className={`alert ${msg.startsWith("✅") ? "ok" : "bad"}`}>
                {msg}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="card">
            <div className="section-title">
              <h3>Quick guide</h3>
              <span className="hint">How it works</span>
            </div>

            <div className="side-list">
              <div className="side-item">
                <div className="t">Login</div>
                <div className="d">
                  Select role and login → you go to your dashboard automatically.
                </div>
              </div>

              <div className="side-item">
                <div className="t">Register</div>
                <div className="d">
                  Tenant/Owner registers → OTP verify → then login.
                </div>
              </div>

              <div className="side-item">
                <div className="t">Role Security</div>
                <div className="d">
                  Owner cannot open Tenant pages, and Admin has separate access.
                </div>
              </div>
            </div>

            <div className="alert" style={{ marginTop: 14, opacity: 0.9 }}>
              Tip: If you refresh the page, you stay logged in because token is saved
              in localStorage.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
