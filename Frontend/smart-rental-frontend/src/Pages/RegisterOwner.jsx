import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Shell from "../components/Shell";
import TextField from "../components/TextField";
import Toast from "../components/Toast";

export default function RegisterOwner() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    address: "",
    phone: "",
    role: "owner",
  });

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setToast({ type: "info", msg: "" });
    setLoading(true);
    try {
      await api.post("owner_register/", form);
      setToast({ type: "success", msg: "Owner registered successfully!" });
      setForm({ username: "", email: "", password: "", address: "", phone: "", role: "owner" });
    } catch (err) {
      const msg = err?.response?.data?.err || err?.response?.data?.detail || "Owner registration failed.";
      setToast({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Register Owner"
      subtitle="Admin only: register an Owner account. Token is sent automatically."
      right={<Link to="/admin" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition">Back</Link>}
    >
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Username" name="username" value={form.username} onChange={onChange} required />
          <TextField label="Phone" name="phone" value={form.phone} onChange={onChange} required />
        </div>

        <TextField label="Email" name="email" value={form.email} onChange={onChange} required />
        <TextField label="Password" name="password" type="password" value={form.password} onChange={onChange} required />
        <TextField label="Address" name="address" value={form.address} onChange={onChange} required />

        <button disabled={loading} className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium hover:bg-indigo-400 transition disabled:opacity-60">
          {loading ? "Creating..." : "Create Owner →"}
        </button>
      </form>
    </Shell>
  );
}
