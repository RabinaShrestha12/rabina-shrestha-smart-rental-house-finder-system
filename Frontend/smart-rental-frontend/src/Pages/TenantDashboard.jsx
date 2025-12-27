import { useAuth } from "../auth/AuthContext";
import Shell from "../components/Shell";

export default function TenantDashboard() {
  const { user, logout } = useAuth();
  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome ${user?.username}.`}
      right={<button onClick={logout} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition">Logout</button>}
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="text-sm font-medium">Tenant features</div>
        <div className="mt-2 text-xs text-slate-300">Add tenant modules here.</div>
      </div>
    </Shell>
  );
}
