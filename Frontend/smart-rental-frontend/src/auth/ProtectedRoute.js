import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, allowRoles }) {
  const { isAuthed } = useAuth();
  const location = useLocation();

  const role = (localStorage.getItem("role") || "").toLowerCase();

  // Not logged in -> go to login page
  if (!isAuthed) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Logged in but role not allowed -> unauthorized
  if (
    allowRoles &&
    !allowRoles.map((r) => r.toLowerCase()).includes(role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
