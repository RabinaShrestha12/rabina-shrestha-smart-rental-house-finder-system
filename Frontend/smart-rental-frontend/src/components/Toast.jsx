import React from "react";

export default function Toast({ type = "info", message, onClose }) {
  if (!message) return null;

  const styles =
    type === "error"
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : type === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : "border-indigo-400/30 bg-indigo-500/10 text-indigo-100";

  return (
    <div className={`mb-4 rounded-2xl border p-3 text-sm ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <div>{message}</div>
        <button onClick={onClose} className="text-xs text-white/70 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
