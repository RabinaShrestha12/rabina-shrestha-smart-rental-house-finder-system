import React, { useState } from "react";
import Shell from "../../components/Shell";
import TextField from "../../components/TextField";
import Toast from "../../components/Toast";
import api from "../../api/axios";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterAdmin() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    address: "",
    phone: "",
    role: "admin",
  });

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setToast({ type: "info", msg: "" });
    setLoading(true);

    try {
      await api.post("/register/", {
        ...form,
        email: (form.email || "").trim().toLowerCase(),
        username: (form.username || "").trim(),
      });

      setToast({
        type: "success",
        msg: "Admin registered successfully. Now login!",
      });

      // ✅ go to your login page
      setTimeout(() => nav("/super-admin-login-9382", { replace: true }), 700);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Registration failed.";
      setToast({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Register Admin"
      subtitle="Create the first admin account. Then login and open the admin dashboard."
      right={
        <Link
          to="/super-admin-login-9382"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Login
        </Link>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={onChange}
            required
          />
          <TextField
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={onChange}
            required
          />
        </div>

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
        <TextField
          label="Address"
          name="address"
          value={form.address}
          onChange={onChange}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium hover:bg-indigo-400 transition disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Admin →"}
        </button>
      </form>
    </Shell>
  );
}
