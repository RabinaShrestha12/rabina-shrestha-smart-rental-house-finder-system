import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useTheme } from "../../components/ThemeContext";
import {
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Home,
  ChevronLeft,
  KeyRound,
  Fingerprint,
} from "lucide-react";

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

const InputField = ({ label, icon: Icon, isDark, ...props }) => (
  <div className="mb-5">
    {label && (
      <label
        className={`block text-[11px] font-black uppercase tracking-widest mb-2 ml-1 ${
          isDark ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </label>
    )}

    <div className="relative group">
      <div
        className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors z-10 ${
          isDark
            ? "text-slate-400 group-focus-within:text-blue-300"
            : "text-slate-400 group-focus-within:text-blue-600"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <input
        {...props}
        className={`block w-full pl-12 pr-4 py-4 rounded-2xl transition-all font-medium shadow-sm focus:outline-none focus:ring-4 ${
          isDark
            ? "bg-[#17365c] border border-white/10 text-white placeholder:text-slate-400 hover:bg-[#1b3f69] focus:bg-[#1b3f69] focus:border-blue-400/50 focus:ring-blue-300/10"
            : "bg-[#f8fafc] border border-slate-200 text-slate-900 placeholder:text-slate-400 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-blue-500/10"
        }`}
      />
    </div>
  </div>
);

export default function UserAuth() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [lForm, setLForm] = useState({ email: "", password: "" });

  const [rForm, setRForm] = useState({
    role: "tenant",
    username: "",
    phone: "",
    address: "",
    email: "",
    password: "",
  });

  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

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

    window.dispatchEvent(new Event("storage"));
    return { access, refresh, role: finalRole };
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");
    setSuccessMsg("");

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
      setSuccessMsg(`Account created! We've sent an OTP to ${cleanEmail}.`);
    } catch (err) {
      setMsg(axiosMsg(err, "Register failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");
    setSuccessMsg("");

    try {
      const email = String(otpEmail || "").trim().toLowerCase();
      const code = String(otpCode || "").trim();

      await api.post("verify-otp/", { email, code, purpose: "signup" });

      setSuccessMsg("OTP verified successfully! Please login.");
      setTab("login");
      setLForm((p) => ({ ...p, email, password: "" }));
    } catch (err) {
      setMsg(axiosMsg(err, "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");
    setSuccessMsg("");

    try {
      const email = String(lForm.email || "").trim().toLowerCase();
      const password = lForm.password;

      const res = await api.post("login_user/", { email, password });
      const saved = saveSession(res.data, email);

      if (!saved.access) {
        setMsg("Access token missing in response.");
        setLoading(false);
        return;
      }

      if (!saved.role) {
        setMsg("User role not found in response.");
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
        if (saved2.access) window.location.href = roleToPath("admin");
      } catch (err2) {
        setMsg(axiosMsg(err2, axiosMsg(err, "Invalid credentials")));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequestOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");
    setSuccessMsg("");

    try {
      const email = String(forgotForm.email || "").trim().toLowerCase();
      await api.post("request-password-reset-otp/", { email });
      setTab("forgotReset");
      setSuccessMsg(`Reset code sent to ${email}.`);
    } catch (err) {
      setMsg(axiosMsg(err, "Failed to send reset code"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");
    setSuccessMsg("");

    const { email, code, new_password, confirm_password } = forgotForm;

    if (new_password !== confirm_password) {
      setMsg("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await api.post("reset-password/", { email, code, new_password });
      setSuccessMsg("Password reset successfully. Please login.");
      setTab("login");
      setLForm((p) => ({ ...p, email, password: "" }));
    } catch (err) {
      setMsg(axiosMsg(err, "Password reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row font-sans selection:bg-blue-600 selection:text-white overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#0b2340] text-white" : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative">
        <img
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=2000"
          alt="Luxury Architecture"
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />

        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-gradient-to-t from-[#05101d] via-[#0b2340]/55 to-transparent"
              : "bg-gradient-to-t from-black/70 via-black/30 to-transparent"
          }`}
        />
        <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay" />

        <div className="relative z-10 w-full p-16 flex flex-col justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => nav("/")}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/12 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300">
              <Home className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              Smart Rental
            </span>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-8">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Secure Portal Access
            </div>

            <h2 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
              Unlock Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
                Perfect Space.
              </span>
            </h2>

            <p className="text-xl text-slate-200 leading-relaxed mb-10 font-medium max-w-md">
              The premier destination for premium properties. Connect with verified
              landlords and secure your high-end rental today.
            </p>

            <div className="flex gap-4">
              <div className="flex items-center gap-3 bg-white/8 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">Verified Users</span>
              </div>

              <div className="flex items-center gap-3 bg-white/8 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-bold text-white">Bank-Grade Security</span>
              </div>
            </div>
          </div>

          <div className="text-slate-300 text-sm font-medium flex items-center gap-2">
            © 2026 Smart Rental
            <span className="w-1 h-1 bg-slate-400/70 rounded-full"></span>
            Real Estate Standards Defined.
          </div>
        </div>
      </div>

      <div
        className={`w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-y-auto transition-colors duration-300 ${
          isDark ? "bg-[#0f2d52]" : "bg-white"
        }`}
      >
        <div
          className="md:hidden flex items-center gap-3 w-full max-w-md mb-8 cursor-pointer"
          onClick={() => nav("/")}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Home className="text-white w-5 h-5" />
          </div>
          <span
            className={`text-xl font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Smart Rental
          </span>
        </div>

        <div className="w-full max-w-md">
          {(tab === "login" || tab === "register") && (
            <div
              className={`flex p-1.5 rounded-[22px] mb-10 w-full transition-colors duration-300 ${
                isDark
                  ? "bg-[#1c3f69] border border-white/10"
                  : "bg-slate-100 border border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setMsg("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${
                  tab === "login"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : isDark
                    ? "bg-[#2b4f7a] text-slate-100 hover:bg-[#35639a] hover:text-white border border-white/10"
                    : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setMsg("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${
                  tab === "register"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : isDark
                    ? "bg-[#2b4f7a] text-slate-100 hover:bg-[#35639a] hover:text-white border border-white/10"
                    : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {tab !== "login" && tab !== "register" && (
            <div className="mb-10">
              <h1
                className={`text-3xl font-black tracking-tight mb-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {tab === "otp" ? "Security Check" : "Password Recovery"}
              </h1>
              <p className={`${isDark ? "text-slate-300" : "text-slate-500"} font-medium`}>
                {tab === "otp"
                  ? "Please enter the verification code sent to your email."
                  : "Follow the steps to reset your password securely."}
              </p>
            </div>
          )}

          {msg && (
            <div
              className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 ${
                isDark
                  ? "bg-red-400/10 border border-red-300/20 text-red-200"
                  : "bg-red-50 border border-red-100 text-red-600"
              }`}
            >
              <span className="shrink-0 text-lg">⚠️</span>
              {msg}
            </div>
          )}

          {successMsg && (
            <div
              className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 ${
                isDark
                  ? "bg-emerald-400/10 border border-emerald-300/20 text-emerald-200"
                  : "bg-emerald-50 border border-emerald-100 text-emerald-700"
              }`}
            >
              <span className="shrink-0 text-lg">✅</span>
              {successMsg}
            </div>
          )}

          <div className="relative">
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  icon={Mail}
                  value={lForm.email}
                  onChange={onChangeLogin}
                  required
                  isDark={isDark}
                />

                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                  value={lForm.password}
                  onChange={onChangeLogin}
                  required
                  isDark={isDark}
                />

                <div className="flex justify-end pt-1 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("forgotRequest");
                      setMsg("");
                    }}
                    className={`text-sm font-semibold transition-colors bg-transparent px-0 py-0 shadow-none border-none hover:underline ${
                      isDark
                        ? "text-blue-300 hover:text-blue-200"
                        : "text-blue-600 hover:text-blue-700"
                    }`}
                  >
                    Forgot your password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? "Authenticating..." : "Sign into Account"}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            )}

            {tab === "register" && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="mb-6">
                  <label
                    className={`block text-[11px] font-black uppercase tracking-widest mb-3 ml-1 ${
                      isDark ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Select Account Type
                  </label>

                  <div
                    className={`grid grid-cols-3 gap-3 p-1.5 rounded-2xl ${
                      isDark
                        ? "bg-[#1c3f69] border border-white/10"
                        : "bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {["tenant", "owner", "provider"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRForm((p) => ({ ...p, role: r }))}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          rForm.role === r
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : isDark
                            ? "bg-[#2b4f7a] text-slate-100 hover:bg-[#35639a] hover:text-white border border-white/10"
                            : "bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200"
                        }`}
                      >
                        {r === "tenant"
                          ? "Tenant"
                          : r === "owner"
                          ? "Owner"
                          : "Provider"}
                      </button>
                    ))}
                  </div>
                </div>

                <InputField
                  label="Full Name"
                  name="username"
                  placeholder="John Doe"
                  icon={User}
                  value={rForm.username}
                  onChange={onChangeRegister}
                  required
                  isDark={isDark}
                />

                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  icon={Mail}
                  value={rForm.email}
                  onChange={onChangeRegister}
                  required
                  isDark={isDark}
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Phone"
                    name="phone"
                    placeholder="+1 234 567"
                    icon={Phone}
                    value={rForm.phone}
                    onChange={onChangeRegister}
                    isDark={isDark}
                  />

                  <InputField
                    label="City"
                    name="address"
                    placeholder="Kathmandu"
                    icon={MapPin}
                    value={rForm.address}
                    onChange={onChangeRegister}
                    isDark={isDark}
                  />
                </div>

                <InputField
                  label="Secure Password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  icon={Lock}
                  value={rForm.password}
                  onChange={onChangeRegister}
                  required
                  isDark={isDark}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? "Creating Profile..." : "Complete Registration"}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            )}

            {tab === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div
                  className={`flex flex-col items-center justify-center p-8 rounded-[30px] border mb-8 text-center ${
                    isDark
                      ? "bg-[#21446e] border-white/10"
                      : "bg-blue-50 border-blue-100"
                  }`}
                >
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${
                      isDark ? "bg-blue-500/15 text-blue-300" : "bg-white text-blue-600 shadow-sm"
                    }`}
                  >
                    <Fingerprint className="w-10 h-10" />
                  </div>

                  <h3
                    className={`text-xl font-bold tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Check your email
                  </h3>

                  <p className={`text-sm font-medium mt-2 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    We've sent a 6-digit verification code to <br className="hidden sm:block" />
                    <span className="font-bold text-blue-600">{otpEmail}</span>
                  </p>
                </div>

                <InputField
                  label="OTP Verification Code"
                  placeholder="e.g. 123456"
                  icon={KeyRound}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  isDark={isDark}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                    isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Return to Login
                </button>
              </form>
            )}

            {tab === "forgotRequest" && (
              <form onSubmit={handleForgotRequestOtp} className="space-y-6">
                <InputField
                  label="Account Email Address"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  icon={Mail}
                  value={forgotForm.email}
                  onChange={onChangeForgot}
                  required
                  isDark={isDark}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? "Sending Process..." : "Send Reset Code"}
                </button>

                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                    isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Cancel and Return
                </button>
              </form>
            )}

            {tab === "forgotReset" && (
              <form onSubmit={handleForgotResetPassword} className="space-y-5">
                <InputField
                  label="Confirm Email Address"
                  name="email"
                  type="email"
                  icon={Mail}
                  value={forgotForm.email}
                  onChange={onChangeForgot}
                  required
                  isDark={isDark}
                />

                <InputField
                  label="Reset Code (OTP)"
                  name="code"
                  placeholder="Enter 6-digit code"
                  icon={KeyRound}
                  value={forgotForm.code}
                  onChange={onChangeForgot}
                  required
                  isDark={isDark}
                />

                <div className={`grid grid-cols-2 gap-4 pt-5 mt-2 ${isDark ? "border-t border-white/10" : "border-t border-slate-200"}`}>
                  <InputField
                    label="New Password"
                    name="new_password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    value={forgotForm.new_password}
                    onChange={onChangeForgot}
                    required
                    isDark={isDark}
                  />

                  <InputField
                    label="Confirm New"
                    name="confirm_password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    value={forgotForm.confirm_password}
                    onChange={onChangeForgot}
                    required
                    isDark={isDark}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? "Updating Security..." : "Confirm & Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}