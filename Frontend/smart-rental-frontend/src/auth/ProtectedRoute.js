import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, allowRoles }) {
  const { isAuthed, role } = useAuth();

  if (!isAuthed) return <Navigate to="/auth" replace />;
  if (allowRoles && !allowRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
