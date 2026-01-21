import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Home() {
  const { user, isAuthed, logout } = useAuth();
  const nav = useNavigate();

  const goDashboard = () => {
    if (!user?.role) return nav("/login");
    if (user.role === "admin") return nav("/admin");
    if (user.role === "owner") return nav("/owner");
    return nav("/tenant");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-semibold">Smart Rental System</h1>
          <p className="mt-2 text-sm text-slate-300">
            Login/Register and go to your role-based dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link to="/login" className="rounded-2xl border border-white/10 bg-black/30 p-5 hover:bg-white/5 transition">
              <div className="text-sm font-medium">Login</div>
              <div className="mt-2 text-xs text-slate-300">Admin / Owner / Tenant</div>
            </Link>

            <Link to="/register-admin" className="rounded-2xl border border-white/10 bg-black/30 p-5 hover:bg-white/5 transition">
              <div className="text-sm font-medium">Register Admin</div>
              <div className="mt-2 text-xs text-slate-300">Create first admin</div>
            </Link>

            <Link to="/register-tenant" className="rounded-2xl border border-white/10 bg-black/30 p-5 hover:bg-white/5 transition">
              <div className="text-sm font-medium">Register Tenant</div>
              <div className="mt-2 text-xs text-slate-300">Tenant self-register</div>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <button onClick={goDashboard} className="rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-medium hover:bg-indigo-400 transition">
              Go to dashboard →
            </button>

            {isAuthed ? (
              <button onClick={logout} className="rounded-2xl border border-white/10 bg-black/30 px-6 py-3 text-sm hover:bg-white/5 transition">
                Logout
              </button>
            ) : null}

            {user ? (
              <div className="text-xs text-slate-300">
                Logged in as <span className="text-white">{user.username}</span> •{" "}
                <span className="text-indigo-300">{user.role}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
