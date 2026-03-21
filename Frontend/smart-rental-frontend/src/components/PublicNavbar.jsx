import React from "react";
import { Link } from "react-router-dom";

export default function PublicNavbar({
  darkMode,
  setDarkMode,
  active = "home",
}) {
  const isDark = darkMode;

  const navBg = isDark
    ? "border-b border-white/10 bg-[#03081c]/90"
    : "border-b border-blue-200 bg-white/90";

  const title = isDark ? "text-white" : "text-blue-950";
  const sub = isDark ? "text-slate-300" : "text-slate-600";

  const linkBase =
    "rounded-full px-5 py-2 text-sm font-semibold transition duration-200";

  const activeClass = isDark
    ? "bg-blue-600 text-white shadow-lg"
    : "bg-blue-100 text-blue-950 shadow";

  const idleClass = isDark
    ? "bg-white/5 text-white hover:bg-blue-600"
    : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white";

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md ${navBg}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
            SRHFS
          </div>

          <div>
            <h1 className={`text-xl font-extrabold ${title}`}>
              Smart Rental House Finder
            </h1>
            <p className={`text-xs ${sub}`}>Modern Rental Platform</p>
          </div>
        </div>

        <nav className="hidden items-center gap-3 md:flex">
          <Link
            to="/"
            className={`${linkBase} ${active === "home" ? activeClass : idleClass}`}
          >
            Home
          </Link>

          <Link
            to="/features"
            className={`${linkBase} ${active === "features" ? activeClass : idleClass}`}
          >
            Features
          </Link>

          <Link
            to="/about"
            className={`${linkBase} ${active === "about" ? activeClass : idleClass}`}
          >
            About
          </Link>

          <Link
            to="/auth"
            className={`${linkBase} ${
              active === "login"
                ? activeClass
                : "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md hover:scale-105"
            }`}
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
  );
}