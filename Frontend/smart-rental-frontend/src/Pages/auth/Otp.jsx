import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../../components/Shell";
import TextField from "../../components/TextField";
import Toast from "../../components/Toast";
import api from "../../api/axios";

export default function Otp() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("otp_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    if (!email || !code) {
      setToast({ type: "error", msg: "Email or OTP missing." });
      return;
    }

    setLoading(true);
    try {
      await api.post("/verify-otp/", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        purpose: "signup",
      });

      sessionStorage.removeItem("otp_email");

      setToast({ type: "success", msg: "OTP verified. You can login now." });

      setTimeout(() => nav("/auth", { replace: true }), 800);
    } catch (err) {
      setToast({
        type: "error",
        msg:
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "OTP verification failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="OTP Verification" subtitle="Enter signup OTP">
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <form onSubmit={submit} className="mt-6 grid gap-4">
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <TextField
          label="OTP Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        <button
          disabled={loading}
          type="submit"
          className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <Link to="/auth" className="text-sm text-center text-indigo-300">
          Back to login
        </Link>
      </form>
    </Shell>
  );
}
