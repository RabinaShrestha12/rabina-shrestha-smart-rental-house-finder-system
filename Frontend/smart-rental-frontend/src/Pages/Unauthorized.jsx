import React from "react";
import { Link } from "react-router-dom";
import Shell from "../components/Shell";

export default function Unauthorized() {
  return (
    <Shell
      title="Unauthorized"
      subtitle="You don't have permission to access this page."
      right={
        <Link
          to="/login"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Login
        </Link>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-slate-200">
        Please login with the correct account type (Admin vs Owner/Tenant).
      </div>
    </Shell>
  );
}
