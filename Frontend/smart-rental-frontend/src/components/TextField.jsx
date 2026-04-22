import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function TextField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  name,
  required,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="text-xs text-slate-300">{label}</span>

      <div className="relative mt-2">
        <input
          name={name}
          required={required}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 ${
            isPassword ? "pr-12" : ""
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}