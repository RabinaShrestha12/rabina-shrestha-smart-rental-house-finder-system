// src/auth/roleDetector.js
import api from "../api/axios";

export function normalizeRole(r) {
  r = String(r || "").trim().toLowerCase();
  if (!r) return "";
  if (r.includes("admin") || r.includes("super") || r.includes("staff")) return "admin";
  if (r.includes("owner") || r.includes("landlord")) return "owner";
  if (r.includes("tenant") || r.includes("renter") || r === "user") return "tenant";
  if (r.includes("provider") || r.includes("service")) return "provider";
  return r;
}

export function roleToPath(role) {
  const r = normalizeRole(role);
  if (r === "admin") return "/admin";
  if (r === "owner") return "/owner";
  if (r === "tenant") return "/tenant";
  if (r === "provider") return "/provider";
  return "/unauthorized";
}

// ✅ Put MANY possible endpoints (so it matches your project even if names differ)
export async function detectRoleByApi() {
  const checks = [
    // OWNER
    { role: "owner", urls: ["owner/profile/", "owner/maintenance/", "owner/my-properties/", "owner/listings/"] },

    // TENANT
    { role: "tenant", urls: ["tenant/profile/", "tenant/inbox/", "tenant/maintenance/", "tenant/bookings/"] },

    // PROVIDER
    { role: "provider", urls: ["provider/jobs/", "provider/profile/", "provider/notifications/"] },

    // ADMIN (optional)
    { role: "admin", urls: ["admin/dashboard/", "admin/email-broadcast/"] },
  ];

  for (const group of checks) {
    for (const url of group.urls) {
      try {
        await api.get(url);
        return group.role;
      } catch (e) {
        // ignore and continue
      }
    }
  }
  return "";
}
