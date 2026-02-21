// src/pages/dashboard/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

function isHtml(x) {
  return typeof x === "string" && x.trim().toLowerCase().includes("<!doctype html");
}

function normalizeRole(r) {
  r = String(r || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  // match your project naming
  if (r === "service_provider" || r === "serviceprovider") return "provider";
  if (r === "superadmin" || r === "super_admin") return "admin";
  if (r === "user" || r === "customer") return "tenant";
  return r;
}

function safeArr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.tenants)) return data.tenants;
  if (Array.isArray(data?.providers)) return data.providers;
  if (Array.isArray(data?.service_providers)) return data.service_providers;
  return [];
}

async function getFirstWorking(endpoints) {
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const res = await api.get(ep);
      if (isHtml(res?.data)) throw new Error("API returned HTML (wrong URL)");
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint worked");
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { logout, email, role } = useAuth();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [providers, setProviders] = useState([]); // ✅ NEW
  const [loading, setLoading] = useState(true);

  const showToast = (type, msg) => setToast({ type, msg });

  const handleLogout = () => {
    logout();
    nav("/super-admin-login-9382", { replace: true });
  };

  const splitByRole = (list) => {
    const o = [];
    const t = [];
    const p = [];

    for (const u of list || []) {
      const r = normalizeRole(u?.role || u?.user_type || u?.account_type);
      if (r === "owner") o.push(u);
      else if (r === "tenant") t.push(u);
      else if (r === "provider") p.push(u);
    }

    setOwners(o);
    setTenants(t);
    setProviders(p);
  };

  const loadData = async () => {
    setLoading(true);
    setOwners([]);
    setTenants([]);
    setProviders([]);
    setToast({ type: "info", msg: "" });

    try {
      // ✅ Try common admin endpoints (add yours here if needed)
      const adminData = await getFirstWorking([
        "admin/dashboard/",
        "admin/dashboard",
        "admin/users/",
        "admin/users",
      ]);

      // backend might return { owners:[], tenants:[], providers:[] }
      if (adminData?.owners || adminData?.tenants || adminData?.providers || adminData?.service_providers) {
        setOwners(safeArr(adminData?.owners));
        setTenants(safeArr(adminData?.tenants));
        setProviders(safeArr(adminData?.providers || adminData?.service_providers));
      } else if (Array.isArray(adminData)) {
        // backend might return a mixed list of users with role field
        splitByRole(adminData);
      } else if (adminData?.results) {
        splitByRole(safeArr(adminData));
      } else {
        // If adminData was not that shape, try owners & tenants & providers separately
        const ownersData = await getFirstWorking([
          "admin/owners/",
          "admin/owners",
          "owners/",
          "owners",
        ]);

        const tenantsData = await getFirstWorking([
          "admin/tenants/",
          "admin/tenants",
          "tenants/",
          "tenants",
        ]);

        // ✅ NEW: providers endpoints
        const providersData = await getFirstWorking([
          "admin/providers/",
          "admin/providers",
          "admin/service-providers/",
          "admin/service-providers",
          "admin/service_providers/",
          "admin/service_providers",
          "providers/",
          "providers",
          "service-providers/",
          "service-providers",
          "service_providers/",
          "service_providers",
        ]);

        setOwners(safeArr(ownersData));
        setTenants(safeArr(tenantsData));
        setProviders(safeArr(providersData));
      }
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to load admin data (wrong API endpoint).";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // basic guard
    if (String(role || "").toLowerCase() !== "admin") {
      nav("/unauthorized", { replace: true });
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const renderRows = (list) =>
    (list || []).map((u, idx) => {
      const r = normalizeRole(u?.role || u?.user_type || u?.account_type);
      return (
        <tr key={u?.id ?? u?.pk ?? idx} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <td style={td}>{u?.id ?? u?.pk ?? "-"}</td>
          <td style={td}>{u?.username ?? u?.name ?? "-"}</td>
          <td style={td}>{u?.email ?? "-"}</td>
          <td style={td}>
            <span style={badge}>{r || "-"}</span>
          </td>
        </tr>
      );
    });

  return (
    <Shell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={headerRow}>
          <div>
            <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              Welcome {email || "Admin"}. View owners, tenants and providers.
            </div>
          </div>

          <button style={btn} onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={btnGhost} onClick={loadData}>
            Refresh
          </button>
        </div>

        {/* OWNERS */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Owners</h3>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Loading…</div>
          ) : owners.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No owners found.</div>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Username</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                </tr>
              </thead>
              <tbody>{renderRows(owners)}</tbody>
            </table>
          )}
        </div>

        {/* TENANTS */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Tenants</h3>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Loading…</div>
          ) : tenants.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No tenants found.</div>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Username</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                </tr>
              </thead>
              <tbody>{renderRows(tenants)}</tbody>
            </table>
          )}
        </div>

        {/* ✅ SERVICE PROVIDERS */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Service Providers</h3>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Loading…</div>
          ) : providers.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No service providers found.</div>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Username</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                </tr>
              </thead>
              <tbody>{renderRows(providers)}</tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(255,255,255,0.04)",
};

const card = {
  marginTop: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(255,255,255,0.04)",
};

const btn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnGhost = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const table = { width: "100%", borderCollapse: "collapse", marginTop: 10 };
const th = { textAlign: "left", fontSize: 12, opacity: 0.8, padding: "10px 8px" };
const td = { padding: "10px 8px", fontSize: 13 };
const badge = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(124,58,237,0.25)",
};
