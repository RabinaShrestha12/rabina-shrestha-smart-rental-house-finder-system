import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function ProviderDashboard() {
  const { role, logout } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const showToast = (type, msg) => setToast({ type, msg });

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("provider/jobs/");
      setJobs(res.data || []);
    } catch (e) {
      showToast("error", e?.response?.data?.detail || "Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== "provider") {
      showToast("error", "You are not authorized to access Provider Dashboard.");
      setLoading(false);
      return;
    }
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ✅ Always allow Accept button (sets in_progress and opens chat)
  const acceptJob = async (jobId) => {
    try {
      await api.patch(`provider/jobs/${jobId}/status/`, { status: "in_progress" });
      showToast("success", "Job accepted. Opening chat...");
      nav(`/provider/chat/${jobId}`);
    } catch (e) {
      showToast("error", e?.response?.data?.detail || "Failed to accept job");
    }
  };

  // ✅ Always allow Reject button
  const rejectJob = async (jobId) => {
    try {
      await api.patch(`provider/jobs/${jobId}/status/`, { status: "rejected" });
      showToast("success", "Job rejected.");
      await loadJobs();
    } catch (e) {
      showToast("error", e?.response?.data?.detail || "Failed to reject job");
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.resolve(logout());
    } finally {
      nav("/auth", { replace: true });
    }
  };

  return (
    <Shell>
      <div style={styles.wrap}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        {/* HEADER */}
        <div style={styles.headerRow}>
          <div>
            <h2 style={{ margin: 0 }}>Service Provider Dashboard</h2>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              View assigned maintenance jobs and chat with the owner.
            </div>
          </div>

          {/* TOP BUTTONS */}
          <div style={styles.topBtns}>
            <button type="button" style={styles.btnGhost} onClick={() => nav("/")}>
              Home
            </button>

            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => nav("/provider/messages")}
            >
              Messages
            </button>

            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => nav("/reminders")}
            >
              Notifications
            </button>

            <button type="button" style={styles.btnGhost} onClick={loadJobs}>
              Refresh
            </button>

            <button type="button" style={styles.btnPrimary} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* JOBS */}
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div style={styles.infoBox}>Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div style={styles.infoBox}>No jobs assigned yet.</div>
          ) : (
            <div style={styles.grid}>
              {jobs.map((j) => (
                <div key={j.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={{ fontWeight: 800 }}>{j.title || `Job #${j.id}`}</div>
                    <div style={{ opacity: 0.9 }}>
                      Status: <b>{j.status}</b>
                    </div>
                  </div>

                  {j.description ? <div style={styles.desc}>{j.description}</div> : null}

                  {/* ✅ ALWAYS SHOW ALL 3 BUTTONS */}
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      onClick={() => acceptJob(j.id)}
                      style={styles.actionBtn}
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectJob(j.id)}
                      style={styles.actionBtn}
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => nav(`/provider/chat/${j.id}`)}
                      style={styles.actionBtn}
                    >
                      Open Chat
                    </button>
                  </div>

                  {/* Optional helper text */}
                  {j.status === "rejected" ? (
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                      This job is currently rejected. You can still accept it again if you want.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

const styles = {
  wrap: { maxWidth: 1200, margin: "0 auto", padding: 16 },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
  },
  topBtns: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  btnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(124,58,237,0.55)",
    background: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  infoBox: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    opacity: 0.9,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", gap: 10 },
  desc: { marginTop: 10, opacity: 0.95, lineHeight: 1.45 },
  actionRow: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(124, 58, 237, 0.35)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
};