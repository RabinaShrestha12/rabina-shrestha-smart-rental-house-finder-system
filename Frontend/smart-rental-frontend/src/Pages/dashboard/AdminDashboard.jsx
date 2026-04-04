import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { 
  Users, Home, MessageSquare, Image as ImageIcon, 
  CreditCard, RefreshCw, LogOut, ShieldCheck, 
  Mail, Settings, ChevronRight
} from "lucide-react";

function isHtml(x) {
  return typeof x === "string" && x.trim().toLowerCase().includes("<!doctype html");
}

function normalizeRole(r) {
  r = String(r || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  if (r === "service_provider" || r === "serviceprovider") return "provider";
  if (r === "superadmin" || r === "super_admin") return "admin";
  if (r === "user" || r === "customer") return "tenant";
  return r;
}

function safeArr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.tenants)) return data.tenants;
  if (Array.isArray(data?.providers)) return data.providers;
  if (Array.isArray(data?.service_providers)) return data.service_providers;
  return [];
}

async function getFirstWorking(endpoints) {
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const res = await api.get(ep);
      if (isHtml(res?.data)) throw new Error("API returned HTML (wrong URL)");
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint worked");
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { logout, email, role } = useAuth();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const showToast = (type, msg) => setToast({ type, msg });

  const handleLogout = () => {
    logout();
    nav("/super-admin-login-9382", { replace: true });
  };

  const splitByRole = (list) => {
    const o = [];
    const t = [];
    const p = [];

    for (const u of list || []) {
      const r = normalizeRole(u?.role || u?.user_type || u?.account_type);
      if (r === "owner") o.push(u);
      else if (r === "tenant") t.push(u);
      else if (r === "provider") p.push(u);
    }

    setOwners(o);
    setTenants(t);
    setProviders(p);
  };

  const loadData = async () => {
    setLoading(true);
    setOwners([]); setTenants([]); setProviders([]);
    setToast({ type: "info", msg: "" });

    try {
      const adminData = await getFirstWorking([
        "admin/dashboard/", "admin/dashboard", "admin/users/", "admin/users",
      ]);

      if (adminData?.owners || adminData?.tenants || adminData?.providers || adminData?.service_providers) {
        setOwners(safeArr(adminData?.owners));
        setTenants(safeArr(adminData?.tenants));
        setProviders(safeArr(adminData?.providers || adminData?.service_providers));
      } else if (Array.isArray(adminData)) {
        splitByRole(adminData);
      } else if (adminData?.results) {
        splitByRole(safeArr(adminData));
      } else {
        const ownersData = await getFirstWorking(["admin/owners/", "admin/owners", "owners/", "owners"]);
        const tenantsData = await getFirstWorking(["admin/tenants/", "admin/tenants", "tenants/", "tenants"]);
        const providersData = await getFirstWorking(["admin/providers/", "admin/providers", "admin/service-providers/", "admin/service-providers", "admin/service_providers/", "admin/service_providers", "providers/", "providers", "service-providers/", "service-providers", "service_providers/", "service_providers"]);

        setOwners(safeArr(ownersData));
        setTenants(safeArr(tenantsData));
        setProviders(safeArr(providersData));
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to load admin data.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (String(role || "").toLowerCase() !== "admin") {
      nav("/unauthorized", { replace: true });
      return;
    }
    loadData();
  }, [role, nav]);

  const stats = useMemo(() => [
    { label: "Owners", count: owners.length, icon: Home, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Tenants", count: tenants.length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Providers", count: providers.length, icon: Settings, color: "text-purple-600", bg: "bg-purple-50" },
  ], [owners.length, tenants.length, providers.length]);

  const renderSection = (title, list, emptyText) => (
    <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-6 mb-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-neutral-900">{title}</h3>
        <span className="px-3 py-1 bg-neutral-100 text-neutral-500 rounded-full text-xs font-bold uppercase tracking-wider">
          {list.length} total
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 font-medium italic">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-50">
                <th className="py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-4">ID</th>
                <th className="py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User Entity</th>
                <th className="py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Email Address</th>
                <th className="py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest pr-4 text-right">Access Role</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u, idx) => (
                <tr key={u?.id ?? u?.pk ?? idx} className="border-b border-neutral-50/50 hover:bg-neutral-50 transition-colors group">
                  <td className="py-4 pl-4 text-xs font-mono text-neutral-400">#{u?.id ?? u?.pk ?? "-"}</td>
                  <td className="py-4 font-bold text-neutral-900">{u?.username ?? u?.name ?? "-"}</td>
                  <td className="py-4 text-sm text-neutral-500 font-medium">{u?.email ?? "-"}</td>
                  <td className="py-4 pr-4 text-right">
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100">
                       {normalizeRole(u?.role || u?.user_type || u?.account_type) || "user"}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Shell 
      title="Global Management"
      subtitle="Enterprise-grade control over your platform users and systems."
      right={(
        <button onClick={handleLogout} className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors rounded-xl font-bold text-sm flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      )}
    >
      <div className="max-w-6xl mx-auto">
        <Toast type={toast.type} msg={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

        {/* Action Belt */}
        <div className="flex flex-wrap items-center gap-3 mb-12 bg-neutral-50 p-4 rounded-[24px] border border-neutral-100 shadow-inner">
          <button onClick={loadData} className="p-3 bg-white text-neutral-600 rounded-xl hover:bg-neutral-100 transition-all border border-neutral-200">
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-neutral-200 mx-2"></div>
          <button onClick={() => nav("/listings")} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 flex items-center gap-2 hover:bg-blue-700 transition-all hover:-translate-y-0.5">
            <ShieldCheck className="w-4 h-4" /> Listings Audit
          </button>
          <button onClick={() => nav("/admin/email-broadcast")} className="px-5 py-2.5 bg-white text-neutral-700 border border-neutral-200 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-50 transition-all">
            <Mail className="w-4 h-4 text-blue-500" /> Broadcasts
          </button>
          <button onClick={() => nav("/admin/furnitures")} className="px-5 py-2.5 bg-white text-neutral-700 border border-neutral-200 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-50 transition-all">
            <Settings className="w-4 h-4 text-purple-500" /> Assets
          </button>
          <button onClick={() => nav("/admin/booking-payments")} className="px-5 py-2.5 bg-white text-neutral-700 border border-neutral-200 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-50 transition-all">
            <CreditCard className="w-4 h-4 text-emerald-500" /> Revenue
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-[32px] border border-neutral-100 p-8 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all cursor-default">
              <div className={`w-14 h-14 ${s.bg} rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                <s.icon className={`w-7 h-7 ${s.color}`} />
              </div>
              <div>
                <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">{s.label}</div>
                <div className="text-3xl font-black text-neutral-900">{loading ? "..." : s.count}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-200 ml-auto group-hover:text-neutral-400 transition-colors" />
            </div>
          ))}
        </div>

        {/* User Sections */}
        {renderSection("Global Owners", owners, "No property owners registered yet.")}
        {renderSection("Global Tenants", tenants, "No customers registered yet.")}
        {renderSection("Global Service Providers", providers, "No service nodes established.")}
      </div>
    </Shell>
  );
}