import React from "react";
import { useTheme } from "./ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: "10px 18px",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: "700",
        background: theme === "light" ? "#111827" : "#f8fbff",
        color: theme === "light" ? "#ffffff" : "#0f2747",
        transition: "all 0.3s ease",
        boxShadow: "0 6px 18px var(--shadow-color)",
      }}
    >
      {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>
  );
}