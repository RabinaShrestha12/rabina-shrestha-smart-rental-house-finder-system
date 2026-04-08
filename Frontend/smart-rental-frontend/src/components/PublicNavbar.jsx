import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../auth/AuthContext";

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed, role } = useAuth();

  const normalizedRole = String(role || "").trim().toLowerCase();

  const isTenantLoggedIn = isAuthed && normalizedRole === "tenant";
  const isOwnerLoggedIn = isAuthed && normalizedRole === "owner";
  const isProviderLoggedIn =
    isAuthed &&
    (normalizedRole === "provider" || normalizedRole === "service_provider");
  const isAdminLoggedIn = isAuthed && normalizedRole === "admin";

  const isLoggedInDashboardUser =
    isTenantLoggedIn ||
    isOwnerLoggedIn ||
    isProviderLoggedIn ||
    isAdminLoggedIn;

  const dashboardPath = isAdminLoggedIn
    ? "/admin"
    : isOwnerLoggedIn
    ? "/owner"
    : isTenantLoggedIn
    ? "/tenant"
    : isProviderLoggedIn
    ? "/provider"
    : "/auth";

  const isOnDashboardPage =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/owner") ||
    location.pathname.startsWith("/tenant") ||
    location.pathname.startsWith("/provider");

  const handleMainButton = () => {
    if (!isLoggedInDashboardUser) {
      navigate("/auth");
      return;
    }

    if (isOnDashboardPage) {
      navigate("/");
    } else {
      navigate(dashboardPath);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <Home className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold text-slate-900">
            Smart Rental
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {!isLoggedInDashboardUser && (
            <nav className="hidden items-center gap-8 md:flex">
              <Link
                to="/"
                className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
              >
                Home
              </Link>
              <Link
                to="/listings"
                className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
              >
                Listings
              </Link>
              <Link
                to="/about"
                className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
              >
                Contact
              </Link>
            </nav>
          )}

          <ThemeToggle />

          <button
            onClick={handleMainButton}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            {isLoggedInDashboardUser ? "Dashboard" : "Get Started"}
          </button>
        </div>
      </div>
    </header>
  );
}