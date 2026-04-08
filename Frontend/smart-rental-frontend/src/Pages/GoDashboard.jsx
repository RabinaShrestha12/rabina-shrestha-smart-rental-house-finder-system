import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function GoDashboard() {
  const nav = useNavigate();
  const { booting, isAuthed, dashboardPath } = useAuth();

  useEffect(() => {
    if (booting) return;

    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }

    nav(dashboardPath || "/unauthorized", { replace: true });
  }, [booting, isAuthed, dashboardPath, nav]);

  return <div style={{ padding: 20 }}>Redirecting to your dashboard...</div>;
}