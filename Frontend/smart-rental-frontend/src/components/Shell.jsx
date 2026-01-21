import React from "react";

export default function Shell({ title, subtitle, children, right }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-300 max-w-2xl">{subtitle}</p>}
          </div>
          {right}
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          {children}
        </div>

        <div className="mt-10 text-center text-xs text-slate-400">
          Smart Rental • React + Django + JWT
        </div>
      </div>
    </div>
  );
}
