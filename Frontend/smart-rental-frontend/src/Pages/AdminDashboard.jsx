import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import Shell from "../components/Shell";
import Toast from "../components/Toast";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("admin/tenants/");
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setTenants(list);
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.response?.data?.err || "Failed to load tenants.";
        setToast({ type: "error", msg });
      }
    };
    load();
  }, []);

  return (
    <Shell
      title="Admin Dashboard"
      subtitle={`Welcome ${user?.username}. Manage tenants and register owners.`}
      right={
        <div className="flex gap-2">
          <Link to="/register-owner" className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 transition">
            + Register Owner
          </Link>
          <button onClick={logout} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition">
            Logout
          </button>
        </div>
      }
    >
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="text-sm font-medium">Tenants</div>
        <div className="mt-1 text-xs text-slate-300">List of tenant accounts</div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-300">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left">ID</th>
                <th className="py-3 text-left">Username</th>
                <th className="py-3 text-left">Email</th>
                <th className="py-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-3">{t.id}</td>
                  <td className="py-3">{t.username}</td>
                  <td className="py-3">{t.email}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-indigo-500/15 border border-indigo-400/20 px-3 py-1 text-xs">
                      {t.role}
                    </span>
                  </td>
                </tr>
              ))}
              {!tenants.length && (
                <tr>
                  <td className="py-4 text-slate-400" colSpan="4">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
