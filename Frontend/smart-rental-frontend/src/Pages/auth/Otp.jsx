import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";

export default function Otp() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("otp_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!email || !code) {
      setMsg("❌ Email or OTP missing.");
      return;
    }

    setLoading(true);
    try {
      await api.post("verify-otp/", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        purpose: "signup",
      });

      sessionStorage.removeItem("otp_email");
      setMsg("✅ OTP verified. You can login now.");
      setTimeout(() => nav("/auth", { replace: true }), 800);
    } catch (err) {
      setMsg("❌ " + (err?.response?.data?.error || "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 20 }}>
      <h2>OTP Verification</h2>
      <p>Enter signup OTP</p>

      {msg ? <div style={{ marginBottom: 12 }}>{msg}</div> : null}

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <input
          placeholder="6 digit OTP"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <button disabled={loading} type="submit" style={{ padding: 10 }}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <Link to="/auth" style={{ textAlign: "center" }}>
          Back to login
        </Link>
      </form>
    </div>
  );
}
