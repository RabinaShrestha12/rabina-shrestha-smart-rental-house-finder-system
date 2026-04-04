import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import TextField from "../../components/TextField";
import Toast from "../../components/Toast";

export default function Login() {
  const [mode, setMode] = useState("admin"); // admin | user
  const [form, setForm] = useState({ email: "", password: "" });
  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(false);

  // ✅ use the actual functions that exist in AuthContext
  const { loginAdmin, loginUser } = useAuth();
  const nav = useNavigate();

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const goByRole = (role) => {
    const r = (role || "").toLowerCase();
    if (r === "admin") return nav("/admin", { replace: true });
    if (r === "owner") return nav("/owner", { replace: true });
    if (r === "tenant") return nav("/tenant", { replace: true });
    return nav("/unauthorized", { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setToast({ type: "info", msg: "" });
    setLoading(true);

    try {
      const data =
        mode === "admin"
          ? await loginAdmin(form.email, form.password)
          : await loginUser(form.email, form.password);

      // ✅ OTP required -> go to OTP page
      if (data?.verification_required) {
        nav("/otp", {
          state: {
            otp_token: data.otp_token,
            purpose: data.purpose || "login",
            email: form.email,
          },
        });
        return;
      }

      // ✅ If backend returns tokens directly (OTP disabled)
      if (data?.tokens && data?.role) {
        goByRole(data.role);
        return;
      }

      setToast({ type: "error", msg: "Unexpected response from server." });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err.message ||
        "Login failed.";
      setToast({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Login"
      subtitle="Choose Admin login or Owner/Tenant login. If OTP is enabled, we will send a code to your email."
      right={
        <Link
          to="/"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Home
        </Link>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm transition border ${
            mode === "admin"
              ? "bg-indigo-500/20 border-indigo-400/30"
              : "bg-black/30 border-white/10 hover:bg-white/5"
          }`}
        >
          Admin Login
        </button>

        <button
          type="button"
          onClick={() => setMode("user")}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm transition border ${
            mode === "user"
              ? "bg-indigo-500/20 border-indigo-400/30"
              : "bg-black/30 border-white/10 hover:bg-white/5"
          }`}
        >
          Owner / Tenant Login
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-4">
        <TextField
          label="Email"
          name="email"
          value={form.email}
          onChange={onChange}
          required
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          required
        />

        <button
          disabled={loading}
          type="submit"
          className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium hover:bg-indigo-400 transition disabled:opacity-60"
        >
          {loading ? "Sending code..." : "Continue →"}
        </button>
      </form>

      <div className="mt-6 text-xs text-slate-300 flex flex-wrap gap-3">
        <Link className="text-indigo-300 hover:text-indigo-200" to="/register-admin">
          Register Admin
        </Link>
        <span>•</span>
        <Link className="text-indigo-300 hover:text-indigo-200" to="/register-tenant">
          Register Tenant
        </Link>
      </div>
    </Shell>
  );
}
