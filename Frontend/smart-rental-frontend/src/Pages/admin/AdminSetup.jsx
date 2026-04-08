import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function AdminSetup() {
  const nav = useNavigate();

  const SETUP_KEY = process.env.REACT_APP_ADMIN_SETUP_KEY || "SETUP-ONLY-123";

  const [setupKey, setSetupKey] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const allowed = setupKey === SETUP_KEY;

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const createAdmin = async (e) => {
    e.preventDefault();
    if (!allowed) {
      setMsg("Invalid setup key.");
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      await api.post("register/", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        address: form.address,
        phone: form.phone,
      });

      setMsg("✅ Admin created successfully. Redirecting to admin login...");

      // ✅ redirect to your actual hidden admin login route
      setTimeout(() => nav("/super-admin-login-9382", { replace: true }), 1000);
    } catch (err) {
      setMsg(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Admin setup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
      <h2>Hidden Admin Setup</h2>
      <p style={{ opacity: 0.8 }}>
        This page is only for creating the admin ONCE.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Setup Key</label>
        <input
          value={setupKey}
          onChange={(e) => setSetupKey(e.target.value)}
          placeholder="Enter setup key"
          style={{ width: "100%", padding: 10 }}
        />
        {!allowed && setupKey && (
          <div style={{ marginTop: 8, color: "tomato" }}>
            Setup key not correct.
          </div>
        )}
      </div>

      <form onSubmit={createAdmin} style={{ opacity: allowed ? 1 : 0.4 }}>
        <input
          name="username"
          placeholder="Admin username"
          value={form.username}
          onChange={onChange}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          disabled={!allowed}
          required
        />
        <input
          name="email"
          placeholder="Admin email"
          value={form.email}
          onChange={onChange}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          disabled={!allowed}
          required
        />
        <input
          name="password"
          placeholder="Admin password"
          type="password"
          value={form.password}
          onChange={onChange}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          disabled={!allowed}
          required
        />
        <input
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={onChange}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          disabled={!allowed}
        />
        <input
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={onChange}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          disabled={!allowed}
        />

        <button
          type="submit"
          disabled={loading || !allowed}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Creating..." : "Create Admin"}
        </button>
      </form>

      {msg ? <div style={{ marginTop: 12, color: "tomato" }}>{msg}</div> : null}
    </div>
  );
}
