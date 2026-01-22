import { Route, Routes } from "react-router-dom";

import PublicHome from "./pages/PublicHome";
import UserAuth from "./pages/auth/UserAuth";
import AdminLogin from "./pages/auth/AdminLogin";

import AdminDashboard from "./pages/dashboard/AdminDashboard";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import TenantDashboard from "./pages/dashboard/TenantDashboard";

import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicHome />} />

      {/* Owner/Tenant Auth */}
      <Route path="/auth" element={<UserAuth />} />

      {/* Admin (hidden URL) */}
      <Route path="/super-admin-login-9382" element={<AdminLogin />} />

      {/* Protected dashboards */}
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

      {/* Common */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
