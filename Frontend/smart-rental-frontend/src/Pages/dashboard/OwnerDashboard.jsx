import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function OwnerDashboard() {
  const { role, email, logout } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // If not logged in
    const token = localStorage.getItem("access");
    if (!token) {
      nav("/auth", { replace: true });
      return;
    }

    // If not owner
    if (role !== "owner") {
      nav("/unauthorized", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        // ✅ Use your api instance (baseURL already has /api)
        // Change endpoint if your backend uses a different one
        const res = await api.get("/owner-profile/");
        setProfile(res.data);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load owner profile.";
        setToast({ type: "error", msg });
      }
    };

    loadProfile();
  }, [role, nav]);

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  return (
    <Shell
      title="Owner Dashboard"
      subtitle={`Welcome ${email || "Owner"}. Manage your profile and properties.`}
      right={
        <button
          onClick={handleLogout}
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

      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-white">My Profile</h2>

        {!profile ? (
          <p className="mt-2 text-sm text-slate-300">Loading...</p>
        ) : (
          <div className="mt-4 text-sm text-slate-200 grid gap-2">
            <div><b>Owner ID:</b> {profile.id ?? "-"}</div>
            <div><b>Username:</b> {profile.username ?? "-"}</div>
            <div><b>Email:</b> {profile.email ?? email ?? "-"}</div>
            <div><b>Phone:</b> {profile.phone ?? "-"}</div>
            <div><b>Address:</b> {profile.address ?? "-"}</div>
          </div>
        )}
      </div>
    </Shell>
  );
}
