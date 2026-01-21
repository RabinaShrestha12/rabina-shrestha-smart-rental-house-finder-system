import React from "react";
import { Routes, Route } from "react-router-dom";

import PublicHome from "./pages/PublicHome";
import UserAuth from "./pages/UserAuth";
import AdminLogin from "./pages/AdminLogin";
import Unauthorized from "./pages/Unauthorized";

import OwnerDashboard from "./pages/OwnerDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicHome />} />

      {/* Owner/Tenant (same UI) */}
      <Route path="/auth" element={<UserAuth />} />

      {/* Admin (hidden URL) - not shown anywhere */}
      <Route path="/super-admin-login-9382" element={<AdminLogin />} />

      {/* Protected */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowRoles={["tenant"]}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/unauthorized" element={<Unauthorized />} />
    </Routes>
  );
}
