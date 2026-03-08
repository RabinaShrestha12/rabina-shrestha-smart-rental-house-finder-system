import React, { useEffect, useMemo, useState } from "react";
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
  const [providers, setProviders] = useState([]);
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
      const adminData = await getFirstWorking([
        "admin/dashboard/",
        "admin/dashboard",
        "admin/users/",
        "admin/users",
      ]);

      if (
        adminData?.owners ||
        adminData?.tenants ||
        adminData?.providers ||
        adminData?.service_providers
      ) {
        setOwners(safeArr(adminData?.owners));
        setTenants(safeArr(adminData?.tenants));
        setProviders(safeArr(adminData?.providers || adminData?.service_providers));
      } else if (Array.isArray(adminData)) {
        splitByRole(adminData);
      } else if (adminData?.results) {
        splitByRole(safeArr(adminData));
      } else {
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
    if (String(role || "").toLowerCase() !== "admin") {
      nav("/unauthorized", { replace: true });
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const stats = useMemo(
    () => [
      {
        label: "Owners",
        count: owners.length,
        icon: "🏠",
        bg: "linear-gradient(135deg, rgba(59,130,246,0.20), rgba(37,99,235,0.08))",
      },
      {
        label: "Tenants",
        count: tenants.length,
        icon: "👥",
        bg: "linear-gradient(135deg, rgba(16,185,129,0.20), rgba(5,150,105,0.08))",
      },
      {
        label: "Providers",
        count: providers.length,
        icon: "🛠️",
        bg: "linear-gradient(135deg, rgba(168,85,247,0.20), rgba(126,34,206,0.08))",
      },
    ],
    [owners.length, tenants.length, providers.length]
  );

  const renderRows = (list) =>
    (list || []).map((u, idx) => {
      const r = normalizeRole(u?.role || u?.user_type || u?.account_type);
      return (
        <tr
          key={u?.id ?? u?.pk ?? idx}
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <td style={td}>{u?.id ?? u?.pk ?? "-"}</td>
          <td style={td}>{u?.username ?? u?.name ?? "-"}</td>
          <td style={td}>{u?.email ?? "-"}</td>
          <td style={td}>
            <span style={badge}>{r || "-"}</span>
          </td>
        </tr>
      );
    });

  const renderSection = (title, list, emptyText) => (
    <div style={card}>
      <div style={sectionHeader}>
        <h3 style={{ margin: 0, fontSize: 20 }}>{title}</h3>
        <span style={smallPill}>
          {list.length} item{list.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div style={{ opacity: 0.85 }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ opacity: 0.75 }}>{emptyText}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Username</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
              </tr>
            </thead>
            <tbody>{renderRows(list)}</tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Shell>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: 16 }}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={heroCard}>
          <div style={heroLeft}>
            <div>
              <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>
                Admin Dashboard
              </h2>
              <div style={{ opacity: 0.82, marginTop: 8, fontSize: 15 }}>
                Welcome {email || "Admin"}. Manage users, listings, communication, and furniture.
              </div>
            </div>

            <div style={actionRow}>
              <button style={btnGhost} onClick={loadData}>
                Refresh
              </button>

              <button
                style={btnBlue}
                onClick={() => nav("/listings")}
              >
                Listings
              </button>

              <button
                style={btnPurple}
                onClick={() => nav("/admin/email-broadcast")}
              >
                Communication
              </button>

              <button
                style={btnCyan}
                onClick={() => nav("/admin/furnitures")}
              >
                Furnitures
              </button>
            </div>
          </div>

          <div style={heroRight}>
            <button style={btn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={statsGrid}>
          {stats.map((s) => (
            <div key={s.label} style={{ ...statCard, background: s.bg }}>
              <div style={statTop}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <span style={statPill}>{s.label}</span>
              </div>
              <div style={statNumber}>{loading ? "..." : s.count}</div>
              <div style={statLabel}>Total {s.label.toLowerCase()}</div>
            </div>
          ))}
        </div>

        {renderSection("Owners", owners, "No owners found.")}
        {renderSection("Tenants", tenants, "No tenants found.")}
        {renderSection("Service Providers", providers, "No service providers found.")}
      </div>
    </Shell>
  );
}

const heroCard = {
  display: "flex",
  alignItems: "stretch",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 24,
  padding: 20,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const heroLeft = {
  flex: "1 1 520px",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const heroRight = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-end",
};

const actionRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 18,
};

const statCard = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  padding: 18,
  minHeight: 120,
};

const statTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const statPill = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
};

const statNumber = {
  marginTop: 16,
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1,
};

const statLabel = {
  marginTop: 8,
  fontSize: 13,
  opacity: 0.8,
};

const card = {
  marginTop: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 8,
};

const smallPill = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 12,
  opacity: 0.9,
};

const btn = {
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnGhost = {
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnBlue = {
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(59,130,246,0.30)",
  background: "rgba(59,130,246,0.14)",
  color: "#dbeafe",
  cursor: "pointer",
  fontWeight: 700,
};

const btnPurple = {
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(168,85,247,0.30)",
  background: "rgba(168,85,247,0.14)",
  color: "#f3e8ff",
  cursor: "pointer",
  fontWeight: 700,
};

const btnCyan = {
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(34,211,238,0.30)",
  background: "rgba(6,182,212,0.14)",
  color: "#d8fbff",
  cursor: "pointer",
  fontWeight: 700,
};

const table = { width: "100%", borderCollapse: "collapse", marginTop: 10 };
const th = {
  textAlign: "left",
  fontSize: 12,
  opacity: 0.8,
  padding: "12px 8px",
};
const td = { padding: "12px 8px", fontSize: 13 };
const badge = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(124,58,237,0.25)",
};