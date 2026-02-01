import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Shell from "../../components/Shell";
import TextField from "../../components/TextField";
import Toast from "../../components/Toast";
import { useAuth } from "../../auth/AuthContext";


export default function Otp() {
  const nav = useNavigate();
  const loc = useLocation();
  const { verifyOtp, resendVerification } = useAuth();

  // ✅ take from state, but also persist in sessionStorage (refresh-safe)
  const stateToken = loc.state?.otp_token || "";
  const statePurpose = loc.state?.purpose || "signup";
  const stateEmail = loc.state?.email || "";

  const [otp_token, setOtpToken] = useState("");
  const [purpose, setPurpose] = useState("signup");
  const [email, setEmail] = useState("");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  useEffect(() => {
    const saved = sessionStorage.getItem("otp_token") || "";
    const savedPurpose = sessionStorage.getItem("otp_purpose") || "signup";
    const savedEmail = sessionStorage.getItem("otp_email") || "";

    const finalToken = stateToken || saved;
    const finalPurpose = statePurpose || savedPurpose;
    const finalEmail = stateEmail || savedEmail;

    setOtpToken(finalToken);
    setPurpose(finalPurpose);
    setEmail(finalEmail);

    if (stateToken) sessionStorage.setItem("otp_token", stateToken);
    if (statePurpose) sessionStorage.setItem("otp_purpose", statePurpose);
    if (stateEmail) sessionStorage.setItem("otp_email", stateEmail);
  }, [stateToken, statePurpose, stateEmail]);

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

    if (!otp_token) {
      setToast({ type: "error", msg: "otp_token missing. Please login/register again." });
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp({ otp_token, code: String(code).trim() });

      // ✅ clear after success
      sessionStorage.removeItem("otp_token");
      sessionStorage.removeItem("otp_purpose");
      sessionStorage.removeItem("otp_email");

      goByRole(res?.role);
    } catch (err) {
      setToast({ type: "error", msg: err.message || "OTP verify failed" });
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerification({ email: (email || "").trim().toLowerCase() });
      setToast({ type: "success", msg: "OTP resent. Use the latest code." });
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Resend failed" });
    }
  };

  return (
    <Shell
      title="OTP Verification"
      subtitle={`Enter OTP for ${purpose}${email ? ` → ${email}` : ""}`}
      right={
        <Link
          to="/auth"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Back
        </Link>
      }
    >
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <form onSubmit={submit} className="mt-6 grid gap-4">
        <TextField
          label="OTP Code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium hover:bg-indigo-400 transition disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify OTP →"}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={loading}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 transition disabled:opacity-60"
        >
          Resend OTP
        </button>
      </form>
    </Shell>
  );
}
