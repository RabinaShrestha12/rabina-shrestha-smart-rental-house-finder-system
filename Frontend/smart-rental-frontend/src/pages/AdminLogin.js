import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await loginAdmin(email, password);
      if ((data.role || "").toLowerCase() === "admin") nav("/admin");
      else setError("Not an admin account");
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.detail || "Admin login failed");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h2 style={{ letterSpacing: 1 }}>System Access</h2>
      <p style={{ color: "#666" }}>Authorized personnel only.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          placeholder="Admin Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div style={{ color: "red" }}>{error}</div>}
        <button type="submit">Enter</button>
      </form>
    </div>
  );
}
