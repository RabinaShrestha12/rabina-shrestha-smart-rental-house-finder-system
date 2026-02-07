// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// PUBLIC
import HomePublic from "./pages/home/HomePublic";
import PublicListings from "./pages/home/PublicListings";
import PublicListingDetails from "./pages/home/PublicListingDetails";
import Listing360Page from "./pages/home/Listing360Page";

// ✅ MAP SEARCH
import MapSearch from "./pages/home/MapSearch";

// AUTH
import UserAuth from "./pages/auth/UserAuth";
import AdminLogin from "./pages/auth/AdminLogin";
import Otp from "./pages/auth/Otp";

// ✅ Service Provider Register Page
import RegisterProvider from "./pages/auth/RegisterProvider";

// ✅ HIDDEN ADMIN SETUP PAGE
import AdminSetup from "./pages/admin/AdminSetup";

// DASHBOARDS
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import TenantDashboard from "./pages/dashboard/TenantDashboard";
import ProviderDashboard from "./pages/dashboard/ProviderDashboard";

// ✅ TENANT PAGES
import TenantInbox from "./pages/dashboard/TenantInbox";

// ✅ OWNER PAGES
import OwnerMyProperties from "./pages/dashboard/OwnerMyProperties";
import OwnerListingDetail from "./pages/dashboard/OwnerListingDetail";
import OwnerListingEdit from "./pages/dashboard/OwnerListingEdit";
import OwnerMessages from "./pages/dashboard/OwnerMessages";

// ✅ ADMIN PAGE (Email UI)
import EmailBroadcast from "./pages/dashboard/EmailBroadcast";

// OWNER / TENANT
import OwnerAddListing from "./pages/home/OwnerAddListing";
import TenantBookPage from "./pages/home/TenantBookPage";

// ✅ NEW FEATURES
import BudgetSplitCalculator from "./pages/tools/BudgetSplitCalculator";

// Maintenance/Emergency pages (protected)
import TenantMaintenance from "./pages/tenant/TenantMaintenance";
import OwnerMaintenance from "./pages/owner/OwnerMaintenance"; // ✅ make sure file exists here

// Reminders page (protected)
import RemindersPage from "./pages/common/RemindersPage";

// COMMON
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// ✅ NEW: dashboard redirect by role
import GoDashboard from "./pages/GoDashboard";

// PROTECTED
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* ======================
          PUBLIC
      ====================== */}
      <Route path="/" element={<HomePublic />} />
      <Route path="/listings" element={<PublicListings />} />
      <Route path="/listings/:id" element={<PublicListingDetails />} />
      <Route path="/public/listings/:id" element={<PublicListingDetails />} />
      <Route path="/listing/:id/360" element={<Listing360Page />} />

      {/* ✅ MAP SEARCH */}
      <Route path="/map" element={<MapSearch />} />

      {/* ✅ TOOL */}
      <Route path="/tools/budget-split" element={<BudgetSplitCalculator />} />

      {/* ✅ AUTO REDIRECT TO CORRECT DASHBOARD */}
      <Route path="/dashboard" element={<GoDashboard />} />

      {/* ======================
          AUTH
      ====================== */}
      <Route path="/auth" element={<UserAuth />} />
      <Route path="/otp" element={<Otp />} />
      <Route path="/super-admin-login-9382" element={<AdminLogin />} />
      <Route path="/setup-admin-9x2k" element={<AdminSetup />} />

      {/* ✅ PROVIDER REGISTER (Public) */}
      <Route path="/register-provider" element={<RegisterProvider />} />

      {/* ======================
          OWNER (Protected)
      ====================== */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/my-properties"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerMyProperties />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/listing/:id"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerListingDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/listing/:id/edit"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerListingEdit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/listings/create"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerAddListing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/messages"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerMessages />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/maintenance"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerMaintenance />
          </ProtectedRoute>
        }
      />

      {/* ======================
          TENANT (Protected)
      ====================== */}
      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowRoles={["tenant"]}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant/inbox"
        element={
          <ProtectedRoute allowRoles={["tenant"]}>
            <TenantInbox />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant/book/:listing_id"
        element={
          <ProtectedRoute allowRoles={["tenant"]}>
            <TenantBookPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant/maintenance"
        element={
          <ProtectedRoute allowRoles={["tenant"]}>
            <TenantMaintenance />
          </ProtectedRoute>
        }
      />

      {/* ======================
          PROVIDER (Protected)
      ====================== */}
      <Route
        path="/provider"
        element={
          <ProtectedRoute allowRoles={["provider", "service_provider"]}>
            <ProviderDashboard />
          </ProtectedRoute>
        }
      />

      {/* ======================
          ADMIN (Protected)
      ====================== */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/email-broadcast"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <EmailBroadcast />
          </ProtectedRoute>
        }
      />

      {/* ======================
          COMMON (Protected)
      ====================== */}
      <Route
        path="/reminders"
        element={
          <ProtectedRoute allowRoles={["admin", "owner", "tenant", "provider", "service_provider"]}>
            <RemindersPage />
          </ProtectedRoute>
        }
      />

      {/* ======================
          COMMON
      ====================== */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
