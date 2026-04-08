import React from "react";
import { useTheme } from "./ThemeContext";

export default function Shell({
  title,
  subtitle,
  right,
  children,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="min-h-screen w-full transition-colors duration-300"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #071a31 0%, #0b2340 45%, #0a1f38 100%)"
          : "linear-gradient(180deg, #f4f8ff 0%, #edf4ff 45%, #eaf2fd 100%)",
        color: isDark ? "#ffffff" : "#0f172a",
      }}
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-10 pb-8 xl:px-8 2xl:px-10">
        {(title || subtitle || right) && (
          <div
            className="mb-4 rounded-[30px] border p-6 transition-colors duration-300"
            style={{
              backgroundColor: isDark ? "#0f2947" : "#ffffff",
              borderColor: isDark ? "rgba(96, 165, 250, 0.16)" : "#dbe7f5",
              boxShadow: isDark
                ? "0 10px 30px rgba(0,0,0,0.18)"
                : "0 10px 30px rgba(59, 130, 246, 0.08)",
            }}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                {title ? (
                  <h1
                    className="text-3xl font-black tracking-tight xl:text-4xl"
                    style={{ color: isDark ? "#ffffff" : "#0f172a" }}
                  >
                    {title}
                  </h1>
                ) : null}

                {subtitle ? (
                  <p
                    className="mt-2 max-w-3xl text-base leading-7"
                    style={{
                      color: isDark ? "rgba(191,219,254,0.82)" : "#475569",
                    }}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {right ? <div className="shrink-0">{right}</div> : null}
            </div>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}