import React from "react";
import { Routes, Route } from "react-router-dom";

<<<<<<< HEAD
import PublicHome from "./pages/PublicHome";
import UserAuth from "./pages/UserAuth";
import AdminLogin from "./pages/AdminLogin";
import Unauthorized from "./pages/Unauthorized";

import OwnerDashboard from "./pages/OwnerDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./auth/ProtectedRoute";
=======
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import RegisterAdmin from "./Pages/RegisterAdmin";
import RegisterOwner from "./Pages/RegisterOwner";
import RegisterTenant from "./Pages/RegisterTenant";

import AdminDashboard from "./Pages/AdminDashboard";
import OwnerDashboard from "./Pages/OwnerDashboard";
import TenantDashboard from "./Pages/TenantDashboard";

import Unauthorized from "./Pages/Unauthorized";
import NotFound from "./Pages/NotFound";
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

export default function App() {
  return (
    <Routes>
<<<<<<< HEAD
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
=======
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route path="/register-admin" element={<RegisterAdmin />} />
      <Route path="/register-owner" element={<RegisterOwner />} />
      <Route path="/register-tenant" element={<RegisterTenant />} />

      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/owner-dashboard" element={<OwnerDashboard />} />
      <Route path="/tenant-dashboard" element={<TenantDashboard />} />

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
    </Routes>
  );
}
