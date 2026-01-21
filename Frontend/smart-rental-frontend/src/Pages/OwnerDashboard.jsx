import React, { useEffect, useState } from "react";
import axios from "axios";
import Shell from "../components/Shell";
import Toast from "../components/Toast";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function OwnerDashboard() {
  const { logout } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [profile, setProfile] = useState(null);

  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("access");

  useEffect(() => {
    // block if not logged in or not owner
    if (!token) return nav("/login", { replace: true });
    if (role !== "owner") return nav("/unauthorized", { replace: true });

    const loadProfile = async () => {
      try {
        // ✅ change this endpoint to your real owner profile API if different
        const res = await axios.get("http://127.0.0.1:8000/api/owner-profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        setToast({
          type: "error",
          msg: err.response?.data?.error || "Failed to load owner profile.",
        });
      }
    };

    loadProfile();
  }, [token, role, nav]);

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  return (
    <Shell
      title="Owner Dashboard"
      subtitle={`Welcome ${username || ""}. Manage your profile and properties.`}
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
            <div><b>Username:</b> {profile.username ?? username ?? "-"}</div>
            <div><b>Email:</b> {profile.email ?? "-"}</div>
            <div><b>Phone:</b> {profile.phone ?? "-"}</div>
            <div><b>Address:</b> {profile.address ?? "-"}</div>
          </div>
        )}
      </div>
    </Shell>
  );
}
