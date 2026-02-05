import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./UserAuth.css";

export default function UserAuth() {
  const navigate = useNavigate();
  const { loginUser, registerUser } = useAuth(); // ✅ only loginUser + registerUser needed

  const [tab, setTab] = useState("login"); // login | register
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // login fields
  const [log, setLog] = useState({ email: "", password: "" });

  // register fields
  const [reg, setReg] = useState({
    role: "tenant",
    username: "",
    address: "",
    phone: "",
    email: "",
    password: "",
  });

  const onLogChange = (e) => setLog({ ...log, [e.target.name]: e.target.value });
  const onRegChange = (e) => setReg({ ...reg, [e.target.name]: e.target.value });

  const goByRole = (role) => {
    const r = (role || "").toLowerCase();
    if (r === "admin") return navigate("/admin", { replace: true });
    if (r === "owner") return navigate("/owner", { replace: true });
    if (r === "tenant") return navigate("/tenant", { replace: true });
    return navigate("/", { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      // ✅ ONE login (backend decides role)
      const data = await loginUser(log.email, log.password);

      // ✅ if your backend uses OTP for login, keep this (optional)
      if (data?.verification_required) {
        navigate("/otp", {
          state: {
            otp_token: data.otp_token,
            purpose: data.purpose || "login",
            email: log.email,
          },
        });
        return;
      }

      // ✅ redirect to dashboard based on role from backend
      if (data?.role) {
        setMsg("✅ Login successful. Redirecting…");
        goByRole(data.role);
        return;
      }

      setMsg("❌ Login failed: Unexpected response from server.");
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
      await registerUser(reg);

      sessionStorage.setItem("otp_email", (reg.email || "").trim().toLowerCase());

      setMsg("✅ Registered. OTP sent to your email. Please verify OTP.");
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
              <p>Login/Register and go to your dashboard.</p>
            </div>
          </div>

          {/* ❌ removed badges row */}
        </div>

        {/* ✅ single centered card */}
        <div className="auth-grid single">
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
                {/* ❌ removed choose account type */}

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
                  Login
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
                  <h3>Create account</h3>
                  <span className="hint">Owner/Tenant register</span>
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
        </div>
      </div>
    </div>
  );
}
