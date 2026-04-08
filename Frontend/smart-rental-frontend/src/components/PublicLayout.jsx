import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";
import PublicFooter from "./PublicFooter";
import { useTheme } from "./ThemeContext";

export default function PublicLayout() {
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Scroll to top on route change cleanly
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 selection:bg-blue-600 selection:text-white ${
        isDark
          ? "bg-[#071120] text-slate-100"
          : "bg-neutral-50 text-neutral-900"
      }`}
    >
      <PublicNavbar />
      <main className="flex-1 flex flex-col w-full relative">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
