// src/pages/GoDashboard.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function GoDashboard() {
  const nav = useNavigate();
  const { role, booting, isAuthed } = useAuth();

  useEffect(() => {
    if (booting) return;

    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }

    const r = String(role || "").toLowerCase();

    if (r === "admin") nav("/admin", { replace: true });
    else if (r === "owner") nav("/owner", { replace: true });
    else if (r === "tenant") nav("/tenant", { replace: true });
    else if (r === "provider" || r === "service_provider") nav("/provider", { replace: true });
    else nav("/unauthorized", { replace: true });
  }, [booting, isAuthed, role, nav]);

  return <div style={{ padding: 20 }}>Redirecting to your dashboard...</div>;
}
