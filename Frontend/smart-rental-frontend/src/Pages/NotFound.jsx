import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-2xl font-semibold">404</div>
        <div className="mt-2 text-sm text-slate-300">Page not found.</div>
        <Link to="/" className="mt-5 inline-block text-indigo-300 hover:text-indigo-200">Go Home →</Link>
      </div>
    </div>
  );
}
