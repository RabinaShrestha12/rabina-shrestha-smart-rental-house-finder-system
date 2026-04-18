import { Route, Routes } from "react-router-dom";

// PUBLIC
import PublicLayout from "./components/PublicLayout";
import AboutPage from "./pages/home/AboutPage";
import ContactPage from "./pages/home/ContactPage";
import HomePublic from "./pages/home/HomePublic";
import Listing360Page from "./pages/home/Listing360Page";
import PublicListingDetails from "./pages/home/PublicListingDetails";
import PublicListings from "./pages/home/PublicListings";

// MAP SEARCH
import MapSearch from "./pages/home/MapSearch";

// AUTH
import AdminLogin from "./pages/auth/AdminLogin";
import Otp from "./pages/auth/Otp";
import RegisterProvider from "./pages/auth/RegisterProvider";
import UserAuth from "./pages/auth/UserAuth";

// ADMIN SETUP
import AdminSetup from "./pages/admin/AdminSetup";

// DASHBOARDS
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import ProviderDashboard from "./pages/dashboard/ProviderDashboard";
import TenantDashboard from "./pages/dashboard/TenantDashboard";

// TENANT PAGES
import PaymentFailed from "./pages/tenant/PaymentFailed";
import PaymentSuccess from "./pages/tenant/PaymentSuccess";
import RoommateChat from "./pages/tenant/RoommateChat";
import RoommateChatList from "./pages/tenant/RoommateChatList";
import RoommateFinder from "./pages/tenant/RoommateFinder";
import RoommateRequests from "./pages/tenant/RoommateRequests";
import TenantAISearch from "./pages/tenant/TenantAISearch";
import TenantBookingPayments from "./pages/tenant/TenantBookingPayments";
import TenantContractPage from "./pages/tenant/TenantContractPage";
import TenantEsewaPay from "./pages/tenant/TenantEsewaPay";
import TenantExpenseTracker from "./pages/tenant/TenantExpenseTracker";
import TenantInbox from "./pages/tenant/TenantInbox";
import TenantMaintenance from "./pages/tenant/TenantMaintenance";
import VirtualFurniturePage from "./pages/tenant/VirtualFurniturePage";

// OWNER PAGES
import OwnerAddListing from "./pages/owner/OwnerAddListing";
import OwnerBookingPayments from "./pages/owner/OwnerBookingPayments";
import OwnerContractPage from "./pages/owner/OwnerContractPage";
import OwnerListingDetail from "./pages/owner/OwnerListingDetail";
import OwnerListingEdit from "./pages/owner/OwnerListingEdit";
import OwnerMaintenance from "./pages/owner/OwnerMaintenance";
import OwnerMessages from "./pages/owner/OwnerMessages";
import OwnerMyProperties from "./pages/owner/OwnerMyProperties";
import OwnerProviderChat from "./pages/owner/OwnerProviderChat";
import OwnerRentalContractsPage from "./pages/owner/OwnerRentalContractsPage";

// PROVIDER PAGES
import ProviderChat from "./pages/provider/ProviderChat";
import ProviderInbox from "./pages/provider/ProviderInbox";
import ProviderNotifications from "./pages/provider/ProviderNotifications";
import ProviderOtp from "./pages/provider/ProviderOtp";

// ADMIN PAGE
import AdminBookingPayments from "./pages/admin/AdminBookingPayments";
import Furnitures from "./pages/admin/Furnitures";
import EmailBroadcast from "./pages/dashboard/EmailBroadcast";

// TENANT BOOK PAGE
import TenantBookPage from "./pages/home/TenantBookPage";

// TOOLS
import BudgetSplitCalculator from "./pages/tools/BudgetSplitCalculator";

// REMINDERS
import RemindersPage from "./pages/common/RemindersPage";

// COMMON
import GoDashboard from "./pages/GoDashboard";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

// PROTECTED
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePublic />} />
        <Route path="/features" element={<PublicListings />} />
        <Route path="/listings" element={<PublicListings />} />
        <Route path="/listings/:id" element={<PublicListingDetails />} />
        <Route path="/public/listings/:id" element={<PublicListingDetails />} />
        <Route path="/listing/:id/360" element={<Listing360Page />} />
        <Route path="/map" element={<MapSearch />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/tools/budget-split" element={<BudgetSplitCalculator />} />
      </Route>

      <Route path="/dashboard" element={<GoDashboard />} />

      {/* AUTH + DASHBOARD PORTALS */}
      <Route element={<PublicLayout />}>
        {/* AUTH */}
        <Route path="/auth" element={<UserAuth />} />
        <Route path="/otp" element={<Otp />} />
        <Route path="/super-admin-login-9382" element={<AdminLogin />} />
        <Route path="/setup-admin-9x2k" element={<AdminSetup />} />
        <Route path="/register-provider" element={<RegisterProvider />} />

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
        <Route
          path="/owner/booking-payments"
          element={
            <ProtectedRoute allowRoles={["owner"]}>
              <OwnerBookingPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/provider-chat"
          element={
            <ProtectedRoute allowRoles={["owner"]}>
              <OwnerProviderChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/provider-chat/:jobId"
          element={
            <ProtectedRoute allowRoles={["owner"]}>
              <OwnerProviderChat />
            </ProtectedRoute>
          }
        />

        {/* OWNER WEBSITE AGREEMENT */}
        <Route
          path="/owner/contract"
          element={
            <ProtectedRoute allowRoles={["owner"]}>
              <OwnerContractPage />
            </ProtectedRoute>
          }
        />

        {/* OWNER ↔ TENANT RENTAL CONTRACTS */}
        <Route
          path="/owner/contracts"
          element={
            <ProtectedRoute allowRoles={["owner"]}>
              <OwnerRentalContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/contracts/:id"
          element={
            <ProtectedRoute allowRoles={["owner"]}>
              <OwnerRentalContractsPage />
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
        <Route
          path="/tenant/dashboard"
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
          path="/tenant/bookings"
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
        <Route
          path="/tenant/ai"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantAISearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/roommates"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <RoommateFinder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/roommates/requests"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <RoommateRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/roommates/chats"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <RoommateChatList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/roommates/chats/:roomId"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <RoommateChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/virtual-furniture"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <VirtualFurniturePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/payment/:bookingId"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantEsewaPay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/esewa-pay"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantEsewaPay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/payment-success"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/payment-failed"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <PaymentFailed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/my-booking-payments"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantBookingPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/booking-payments"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantBookingPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/expenses"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantExpenseTracker />
            </ProtectedRoute>
          }
        />

        {/* TENANT RENTAL CONTRACTS */}
        <Route
          path="/tenant/contracts"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantContractPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/contracts/:id"
          element={
            <ProtectedRoute allowRoles={["tenant"]}>
              <TenantContractPage />
            </ProtectedRoute>
          }
        />

        {/* PROVIDER */}
        <Route
          path="/provider"
          element={
            <ProtectedRoute allowRoles={["provider", "service_provider"]}>
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/messages"
          element={
            <ProtectedRoute allowRoles={["provider", "service_provider"]}>
              <ProviderInbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/chat/:jobId"
          element={
            <ProtectedRoute allowRoles={["provider", "service_provider"]}>
              <ProviderChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/notifications"
          element={
            <ProtectedRoute allowRoles={["provider", "service_provider"]}>
              <ProviderNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/otp"
          element={
            <ProtectedRoute allowRoles={["provider", "service_provider"]}>
              <ProviderOtp />
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
        <Route
          path="/admin/furnitures"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <Furnitures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/booking-payments"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminBookingPayments />
            </ProtectedRoute>
          }
        />

        {/* COMMON */}
        <Route
          path="/reminders"
          element={
            <ProtectedRoute
              allowRoles={[
                "admin",
                "owner",
                "tenant",
                "provider",
                "service_provider",
              ]}
            >
              <RemindersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}