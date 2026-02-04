import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function AdminDashboard() {
  const { auth, logout } = useAuth();
  const email = auth?.email || "";

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ✅ IMPORTANT: NO leading "/" or axios will drop /api/
        // ✅ FIXED: These must match Django urls.py:
        //     path("admin/owners/", list_owners)
        //     path("admin/tenants/", list_tenants)
        const [ownersRes, tenantsRes] = await Promise.all([
          api.get("admin/owners/"),
          api.get("admin/tenants/"),
        ]);

        const ownersList = Array.isArray(ownersRes.data)
          ? ownersRes.data
          : ownersRes.data?.results || [];

        const tenantsList = Array.isArray(tenantsRes.data)
          ? tenantsRes.data
          : tenantsRes.data?.results || [];

        setOwners(ownersList);
        setTenants(tenantsList);
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;

        const msg =
          data?.detail ||
          data?.error ||
          (typeof data === "string" ? data : "") ||
          `Failed to load users (status: ${status || "?"}).`;

        // Default error message
        setToast({ type: "error", msg });

        // Helpful hints based on status
        if (status === 401) {
          setToast({
            type: "error",
            msg: "Unauthorized (401). Admin token missing/expired. Please login again.",
          });
        }
        if (status === 403) {
          setToast({
            type: "error",
            msg: "Forbidden (403). Your account is not admin or role permission failed.",
          });
        }
        if (status === 404) {
          setToast({
            type: "error",
            msg: "Not found (404). Check Django URL patterns for admin/owners and admin/tenants.",
          });
        }
      } finally {
        setLoading(false);
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

      {loading && (
        <div className="mb-4 text-sm text-slate-300">Loading users…</div>
      )}

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
              {!loading && !owners.length && (
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
              {!loading && !tenants.length && (
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
