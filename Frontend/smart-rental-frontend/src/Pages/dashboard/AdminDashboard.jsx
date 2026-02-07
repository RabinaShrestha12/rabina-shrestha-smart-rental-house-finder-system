// src/pages/dashboard/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

function isHtml(x) {
  return (
    typeof x === "string" &&
    x.trim().toLowerCase().includes("<!doctype html")
  );
}

function safeArr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.tenants)) return data.tenants;
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
  const [loading, setLoading] = useState(true);

  const showToast = (type, msg) => setToast({ type, msg });

  const handleLogout = () => {
    logout();
    nav("/super-admin-login-9382", { replace: true });
  };

  const loadData = async () => {
    setLoading(true);
    setOwners([]);
    setTenants([]);
    setToast({ type: "info", msg: "" });

    try {
      // ✅ Try common admin endpoints (change/add yours here if needed)
      const adminData = await getFirstWorking([
        "admin/dashboard/",
        "admin/dashboard",
        "admin/users/",
        "admin/users",
      ]);

      // backend might return { owners:[], tenants:[] }
      if (adminData?.owners || adminData?.tenants) {
        setOwners(safeArr(adminData?.owners));
        setTenants(safeArr(adminData?.tenants));
      } else if (Array.isArray(adminData)) {
        // backend might return a mixed list of users with role field
        const list = adminData;
        setOwners(list.filter((u) => String(u?.role || "").toLowerCase() === "owner"));
        setTenants(list.filter((u) => String(u?.role || "").toLowerCase() === "tenant"));
      } else if (adminData?.results) {
        const list = safeArr(adminData);
        setOwners(list.filter((u) => String(u?.role || "").toLowerCase() === "owner"));
        setTenants(list.filter((u) => String(u?.role || "").toLowerCase() === "tenant"));
      } else {
        // If adminData was not that shape, try owners & tenants separately
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

        setOwners(safeArr(ownersData));
        setTenants(safeArr(tenantsData));
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
    list.map((u, idx) => (
      <tr key={u?.id ?? u?.pk ?? idx} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <td style={td}>{u?.id ?? u?.pk ?? "-"}</td>
        <td style={td}>{u?.username ?? u?.name ?? "-"}</td>
        <td style={td}>{u?.email ?? "-"}</td>
        <td style={td}>
          <span style={badge}>{String(u?.role || "").toLowerCase() || "-"}</span>
        </td>
      </tr>
    ));

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
              Welcome {email || "Admin"}. View owners and tenants.
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
