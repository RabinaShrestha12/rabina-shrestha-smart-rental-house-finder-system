import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";

import Home from "./Pages/Home";
import Login from "./Pages/Login";
import RegisterAdmin from "./Pages/RegisterAdmin";
import RegisterTenant from "./Pages/RegisterTenant";
import RegisterOwner from "./Pages/RegisterOwner";

import AdminDashboard from "./Pages/AdminDashboard";
import OwnerDashboard from "./Pages/OwnerDashboard";
import TenantDashboard from "./Pages/TenantDashboard";

import Unauthorized from "./Pages/Unauthorized";
import NotFound from "./Pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register-admin" element={<RegisterAdmin />} />
      <Route path="/register-tenant" element={<RegisterTenant />} />

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/register-owner" element={<RegisterOwner />} />
      </Route>

      <Route element={<ProtectedRoute roles={["owner"]} />}>
        <Route path="/owner" element={<OwnerDashboard />} />
      </Route>

      <Route element={<ProtectedRoute roles={["tenant"]} />}>
        <Route path="/tenant" element={<TenantDashboard />} />
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
