// src/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function normalizeRole(role) {
  const r = String(role || "").trim().toLowerCase();
  if (!r) return "";

  // ✅ IMPORTANT normalizations
  if (r === "user") return "tenant";
  if (r === "service_provider") return "provider";
  if (r === "superadmin" || r === "super_admin") return "admin";

  return r;
}

function getToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

export default function ProtectedRoute({ children, allowRoles = [] }) {
  const location = useLocation();

  const token = getToken();
  const role = normalizeRole(localStorage.getItem("role"));

  if (!token) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const allowed = (allowRoles || []).map(normalizeRole);

  if (allowed.length && !allowed.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
