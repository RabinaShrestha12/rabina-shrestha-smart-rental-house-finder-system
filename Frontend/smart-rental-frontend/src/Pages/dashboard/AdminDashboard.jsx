import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function AdminDashboard() {
  const { email, logout } = useAuth();

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        // ✅ these match your Django URL patterns
        const [ownersRes, tenantsRes] = await Promise.all([
          api.get("/admin/users/owners/"),
          api.get("/admin/users/tenants/"),
        ]);

        const ownersList = Array.isArray(ownersRes.data)
          ? ownersRes.data
          : (ownersRes.data?.results || []);
        const tenantsList = Array.isArray(tenantsRes.data)
          ? tenantsRes.data
          : (tenantsRes.data?.results || []);

        setOwners(ownersList);
        setTenants(tenantsList);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          (typeof err?.response?.data === "string" ? "API returned HTML (wrong URL)" : "") ||
          `Failed to load users (status: ${err?.response?.status || "?"}).`;

        setToast({ type: "error", msg });
      }
    };

    load();
  }, []);

  return (
    <Shell
      title="Admin Dashboard"
      subtitle={`Welcome ${email || "Admin"}. View owners and tenants.`}
      right={
        <button
          onClick={logout}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Logout
        </button>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      {/* Owners */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 mb-6">
        <div className="text-sm font-medium">Owners</div>
        <div className="mt-1 text-xs text-slate-300">List of owner accounts</div>

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
              {owners.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-3">{u.id}</td>
                  <td className="py-3">{u.username}</td>
                  <td className="py-3">{u.email}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-indigo-500/15 border border-indigo-400/20 px-3 py-1 text-xs">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
              {!owners.length && (
                <tr>
                  <td className="py-4 text-slate-400" colSpan={4}>
                    No owners found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenants */}
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
              {tenants.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-3">{u.id}</td>
                  <td className="py-3">{u.username}</td>
                  <td className="py-3">{u.email}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-indigo-500/15 border border-indigo-400/20 px-3 py-1 text-xs">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
              {!tenants.length && (
                <tr>
                  <td className="py-4 text-slate-400" colSpan={4}>
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
