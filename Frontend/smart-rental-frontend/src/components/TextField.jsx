import React from "react";

export default function TextField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  name,
  required,
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-300">{label}</span>
      <input
        name={name}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20"
      />
    </label>
  );
}
