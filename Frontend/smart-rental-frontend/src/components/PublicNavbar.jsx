import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "./ThemeContext";
import ThemeToggle from "./ThemeToggle";
import { Menu, X, Home } from "lucide-react";

export default function PublicNavbar() {
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goDashboard = () => {
    if (!user?.role) return nav("/auth");
    if (user.role === "admin") return nav("/admin");
    if (user.role === "owner") return nav("/owner");
    return nav("/tenant");
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname !== "/") return false;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return location.pathname === path;
  };

  const isHome = location.pathname === "/";

  const navBackground =
    scrolled || !isHome
      ? isDark
        ? "bg-[#122c50]/95 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/20 py-3"
        : "bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm py-3"
      : "bg-transparent py-5";

  const brandTextClass =
    scrolled || !isHome
      ? isDark
        ? "text-white"
        : "text-neutral-900"
      : "text-white drop-shadow-md";

  const textClass =
    scrolled || !isHome
      ? isDark
        ? "text-white"
        : "text-neutral-900"
      : "text-white";

  const linkClass = (path) => {
    if (isActive(path)) return "text-blue-500";

    if (scrolled || !isHome) {
      return isDark
        ? "text-slate-200 hover:text-blue-300"
        : "text-neutral-700 hover:text-blue-600";
    }

    return "text-white hover:text-blue-300";
  };

  const mobileMenuClass = isDark
    ? "absolute top-full left-0 w-full bg-[#122c50] border-b border-white/10 shadow-2xl p-6 flex flex-col gap-4 md:hidden"
    : "absolute top-full left-0 w-full bg-white border-b border-neutral-200 shadow-xl p-6 flex flex-col gap-4 md:hidden";

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navBackground}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => nav("/")}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Home className="text-white w-5 h-5" />
          </div>

          <span className={`text-xl font-bold tracking-tight ${brandTextClass}`}>
            Smart Rental
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 font-medium">
          <Link to="/" className={`transition-colors ${linkClass("/")}`}>
            Home
          </Link>

          <Link
            to="/listings"
            className={`transition-colors ${linkClass("/listings")}`}
          >
            Listings
          </Link>

          <Link
            to="/about"
            className={`transition-colors ${linkClass("/about")}`}
          >
            About
          </Link>

          <ThemeToggle />

          <button
            onClick={goDashboard}
            className="px-6 py-2.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 hover:bg-blue-700 transition-all"
          >
            {user ? "Dashboard" : "Get Started"}
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button className="p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className={textClass} /> : <Menu className={textClass} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className={`${mobileMenuClass} animate-in slide-in-from-top-4`}>
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className={`text-lg font-medium ${
              isActive("/")
                ? "text-blue-500"
                : isDark
                ? "text-slate-100"
                : "text-neutral-800"
            }`}
          >
            Home
          </Link>

          <Link
            to="/listings"
            onClick={() => setIsMenuOpen(false)}
            className={`text-lg font-medium ${
              isActive("/listings")
                ? "text-blue-500"
                : isDark
                ? "text-slate-100"
                : "text-neutral-800"
            }`}
          >
            Listings
          </Link>

          <Link
            to="/about"
            onClick={() => setIsMenuOpen(false)}
            className={`text-lg font-medium ${
              isActive("/about")
                ? "text-blue-500"
                : isDark
                ? "text-slate-100"
                : "text-neutral-800"
            }`}
          >
            About
          </Link>

          <hr className={isDark ? "my-2 border-white/10" : "my-2 border-neutral-100"} />

          <button
            onClick={() => {
              setIsMenuOpen(false);
              goDashboard();
            }}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all"
          >
            {user ? "Dashboard" : "Get Started"}
          </button>
        </div>
      )}
    </nav>
  );
}