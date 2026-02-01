import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, allowRoles }) {
  const { isAuthed, auth } = useAuth();
  const role = (auth?.role || "").toLowerCase();

  if (!isAuthed) return <Navigate to="/auth" replace />;

  if (allowRoles && !allowRoles.map(r => r.toLowerCase()).includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
