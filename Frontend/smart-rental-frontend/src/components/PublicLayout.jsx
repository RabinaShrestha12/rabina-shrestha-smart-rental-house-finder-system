import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";
import PublicFooter from "./PublicFooter";

export default function PublicLayout() {
  const location = useLocation();

  // Scroll to top on route change cleanly
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-neutral-50 text-neutral-900 selection:bg-blue-600 selection:text-white">
      <PublicNavbar />
      <main className="flex-1 flex flex-col w-full relative">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
