import React from "react";
import { Routes, Route } from "react-router-dom";

// PUBLIC
import HomePublic from "./pages/home/HomePublic";
import PublicListings from "./pages/home/PublicListings";
import PublicListingDetails from "./pages/home/PublicListingDetails";
import Listing360Page from "./pages/home/Listing360Page";

// AUTH
import UserAuth from "./pages/auth/UserAuth";
import AdminLogin from "./pages/auth/AdminLogin";
import Otp from "./pages/auth/Otp";

// ✅ HIDDEN ADMIN SETUP PAGE
import AdminSetup from "./pages/admin/AdminSetup";

// DASHBOARDS
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import TenantDashboard from "./pages/dashboard/TenantDashboard";

// ✅ TENANT PAGES
import TenantInbox from "./pages/dashboard/TenantInbox"; // ✅ ADD THIS

// ✅ OWNER PAGES
import OwnerMyProperties from "./pages/dashboard/OwnerMyProperties";
import OwnerListingDetail from "./pages/dashboard/OwnerListingDetail";
import OwnerListingEdit from "./pages/dashboard/OwnerListingEdit";

// ✅ OWNER MESSAGES PAGE
import OwnerMessages from "./pages/dashboard/OwnerMessages";

// ✅ NEW ADMIN PAGE (Email UI)
import EmailBroadcast from "./pages/dashboard/EmailBroadcast";

// OWNER / TENANT
import OwnerAddListing from "./pages/home/OwnerAddListing";
import TenantBookPage from "./pages/home/TenantBookPage";

// COMMON
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// PROTECTED
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<HomePublic />} />
      <Route path="/listings" element={<PublicListings />} />
      <Route path="/listings/:id" element={<PublicListingDetails />} />
      <Route path="/public/listings/:id" element={<PublicListingDetails />} />
      <Route path="/listing/:id/360" element={<Listing360Page />} />

      {/* AUTH */}
      <Route path="/auth" element={<UserAuth />} />
      <Route path="/otp" element={<Otp />} />
      <Route path="/super-admin-login-9382" element={<AdminLogin />} />

      {/* ✅ HIDDEN: ADMIN SETUP */}
      <Route path="/setup-admin-9x2k" element={<AdminSetup />} />

      {/* OWNER */}
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

      {/* ✅ Owner Messages */}
      <Route
        path="/owner/messages"
        element={
          <ProtectedRoute allowRoles={["owner"]}>
            <OwnerMessages />
          </ProtectedRoute>
        }
      />

      {/* TENANT */}
      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowRoles={["tenant"]}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ Tenant Inbox (needed for replies + ?open= ) */}
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

      {/* ADMIN */}
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

      {/* COMMON */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
