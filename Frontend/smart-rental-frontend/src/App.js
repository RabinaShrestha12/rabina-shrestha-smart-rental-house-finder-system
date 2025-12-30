import React from "react";
import { Routes, Route } from "react-router-dom";

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

export default function App() {
  return (
    <Routes>
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
    </Routes>
  );
}
