import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function HomePublic() {
  const nav = useNavigate();
  const { user } = useAuth();

  // Light mode by default
  const [darkMode, setDarkMode] = useState(false);

  const isDark = darkMode;

  const goDashboard = () => {
    if (!user?.role) return nav("/auth");
    if (user.role === "admin") return nav("/admin");
    if (user.role === "owner") return nav("/owner");
    return nav("/tenant");
  };

  const pageBg = isDark
    ? "min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    : "min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-100 text-slate-900";

  const navBg = isDark
    ? "border-b border-white/10 bg-slate-950/80"
    : "border-b border-blue-200 bg-white/90";

  const heading = isDark ? "text-white" : "text-blue-950";
  const sub = isDark ? "text-slate-300" : "text-slate-600";

  const softCard = isDark
    ? "border border-white/10 bg-white/5"
    : "border border-blue-100 bg-white";

  return (
    <div className={pageBg}>
      <header className={`sticky top-0 z-50 backdrop-blur-md ${navBg}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className={`text-xl font-extrabold ${heading}`}>
              Smart Rental House Finder
            </h1>
            <p className={`text-xs ${sub}`}>Modern Rental Platform</p>
          </div>

          <nav className="hidden md:flex items-center gap-3">
            <Link
              to="/"
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                isDark
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-blue-100 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              Home
            </Link>

            <Link
              to="/features"
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                isDark
                  ? "bg-white/5 text-white hover:bg-blue-600"
                  : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              Features
            </Link>

            <Link
              to="/about"
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                isDark
                  ? "bg-white/5 text-white hover:bg-blue-600"
                  : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              About
            </Link>

            <Link
              to="/auth"
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
            >
              Login
            </Link>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isDark
                  ? "bg-white text-slate-900 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-blue-950"
              }`}
            >
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                isDark
                  ? "border border-white/10 bg-white/5 text-blue-200"
                  : "border border-blue-100 bg-blue-50 text-blue-800"
              }`}
            >
              Final Year Project
            </div>

            <h2 className={`mt-6 text-5xl font-extrabold leading-tight ${heading}`}>
              Smart Rental House Finder System
            </h2>

            <p className={`mt-6 max-w-2xl text-lg leading-8 ${sub}`}>
              This project is a modern rental platform designed to help users
              find rooms, apartments, and houses more easily. It supports public
              browsing, owner-added property display, map-based searching, and
              role-based access for admin, owner, and tenant.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/features"
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
              >
                View Properties
              </Link>

              <Link
                to="/about"
                className={`rounded-2xl px-7 py-3 text-sm font-semibold transition ${
                  isDark
                    ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    : "border border-blue-200 bg-white text-blue-950 hover:bg-blue-50"
                }`}
              >
                About Project
              </Link>

              <button
                onClick={goDashboard}
                className={`rounded-2xl px-7 py-3 text-sm font-semibold transition ${
                  isDark
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-slate-900 text-white hover:bg-blue-950"
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>

          <div className={`rounded-[32px] p-8 shadow-2xl ${softCard}`}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-500/20 p-6">
                <p className={`text-sm font-semibold ${sub}`}>PROPERTY TYPES</p>
                <h3 className={`mt-2 text-3xl font-extrabold ${heading}`}>Rooms</h3>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-cyan-600/20 to-blue-500/20 p-6">
                <p className={`text-sm font-semibold ${sub}`}>PROPERTY TYPES</p>
                <h3 className={`mt-2 text-3xl font-extrabold ${heading}`}>Apartments</h3>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-indigo-600/20 to-violet-500/20 p-6">
                <p className={`text-sm font-semibold ${sub}`}>PROPERTY TYPES</p>
                <h3 className={`mt-2 text-3xl font-extrabold ${heading}`}>Houses</h3>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-emerald-600/20 to-teal-500/20 p-6">
                <p className={`text-sm font-semibold ${sub}`}>SMART SEARCH</p>
                <h3 className={`mt-2 text-3xl font-extrabold ${heading}`}>Map Based</h3>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}