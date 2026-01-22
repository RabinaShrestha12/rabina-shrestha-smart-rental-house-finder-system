import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";

export default function TenantDashboard() {
  const { role, email, logout, isAuthed } = useAuth();
  const nav = useNavigate();

  // Optional: redirect guards (ProtectedRoute already does this, but safe)
  if (!isAuthed) {
    nav("/auth", { replace: true });
    return null;
  }

  if (role !== "tenant") {
    nav("/unauthorized", { replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome ${email || "Tenant"}.`}
      right={
        <button
          onClick={handleLogout}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Logout
        </button>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="text-sm font-medium">Tenant features</div>
        <div className="mt-2 text-xs text-slate-300">
          Add tenant modules here (saved listings, recommendations, messages).
        </div>
      </div>
    </Shell>
  );
}
