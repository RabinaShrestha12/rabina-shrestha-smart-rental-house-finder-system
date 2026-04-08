import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

function normalizeRole(v) {
  return String(v || "").trim().toLowerCase();
}

function arrify(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function statusStyles(status, isDark) {
  const s = String(status || "").toLowerCase();

  if (s === "open") {
    return isDark
      ? {
          color: "#bfdbfe",
          background: "#1e3a5f",
          border: "1px solid rgba(96, 165, 250, 0.28)",
          label: "Open",
        }
      : {
          color: "#1d4ed8",
          background: "#dbeafe",
          border: "1px solid #bfdbfe",
          label: "Open",
        };
  }

  if (s === "in_progress") {
    return isDark
      ? {
          color: "#fed7aa",
          background: "#5b3415",
          border: "1px solid rgba(251, 146, 60, 0.28)",
          label: "In Progress",
        }
      : {
          color: "#7c2d12",
          background: "#ffedd5",
          border: "1px solid #fed7aa",
          label: "In Progress",
        };
  }

  if (s === "resolved" || s === "completed") {
    return isDark
      ? {
          color: "#bbf7d0",
          background: "#153928",
          border: "1px solid rgba(74, 222, 128, 0.28)",
          label: "Completed",
        }
      : {
          color: "#166534",
          background: "#dcfce7",
          border: "1px solid #bbf7d0",
          label: "Completed",
        };
  }

  if (s === "rejected") {
    return isDark
      ? {
          color: "#fecaca",
          background: "#4a1f24",
          border: "1px solid rgba(248, 113, 113, 0.28)",
          label: "Rejected",
        }
      : {
          color: "#991b1b",
          background: "#fee2e2",
          border: "1px solid #fecaca",
          label: "Rejected",
        };
  }

  return isDark
    ? {
        color: "#e2e8f0",
        background: "#223a57",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        label: status || "Unknown",
      }
    : {
        color: "#374151",
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        label: status || "Unknown",
      };
}

export default function ProviderDashboard() {
  const { role, logout, booting, isAuthed } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  const firstLoadRef = useRef(true);
  const previousJobsMapRef = useRef({});

  const showToast = (type, msg) => setToast({ type, msg });

  const buildJobMap = (list) => {
    const map = {};
    for (const item of list) {
      map[String(item.id)] = {
        id: item.id,
        title: item.title || `Job #${item.id}`,
        owner_name: item.owner_name || "Owner",
        unread_count: Number(item.unread_count || 0),
        status: item.status || "",
        last_message: item.last_message || "",
      };
    }
    return map;
  };

  const detectNotifications = (newJobs) => {
    const prevMap = previousJobsMapRef.current || {};
    const nextMap = buildJobMap(newJobs);

    if (firstLoadRef.current) {
      previousJobsMapRef.current = nextMap;
      firstLoadRef.current = false;
      return;
    }

    for (const id of Object.keys(nextMap)) {
      if (!prevMap[id]) {
        const job = nextMap[id];
        showToast(
          "success",
          `New maintenance request from ${job.owner_name}: ${job.title}`
        );
        previousJobsMapRef.current = nextMap;
        return;
      }
    }

    for (const id of Object.keys(nextMap)) {
      const oldJob = prevMap[id];
      const newJob = nextMap[id];

      if (!oldJob) continue;

      if (newJob.unread_count > oldJob.unread_count) {
        showToast(
          "success",
          `${newJob.owner_name} sent a new message about "${newJob.title}"`
        );
        previousJobsMapRef.current = nextMap;
        return;
      }
    }

    previousJobsMapRef.current = nextMap;
  };

  const loadJobs = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get("provider/inbox/");
      const list = arrify(res.data);
      detectNotifications(list);
      setJobs(list);
    } catch (e) {
      if (!silent) {
        showToast(
          "error",
          e?.response?.data?.detail ||
            e?.response?.data?.error ||
            "Failed to load jobs"
        );
      }
      setJobs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (booting) return;

    const r = normalizeRole(role);
    if (!isAuthed || (r !== "provider" && r !== "service_provider")) {
      nav("/auth", { replace: true });
      return;
    }

    loadJobs(false);

    const timer = setInterval(() => {
      loadJobs(true);
    }, 5000);

    return () => clearInterval(timer);
  }, [booting, role, isAuthed, nav]);

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    list.sort((a, b) =>
      String(b?.last_message_at || b?.updated_at || b?.created_at || "").localeCompare(
        String(a?.last_message_at || a?.updated_at || a?.created_at || "")
      )
    );
    return list;
  }, [jobs]);

  const totalMessageUnread = useMemo(
    () =>
      sortedJobs.reduce((sum, item) => sum + Number(item?.unread_count || 0), 0),
    [sortedJobs]
  );

  const totalOpenJobs = useMemo(
    () =>
      sortedJobs.filter((j) => String(j?.status || "").toLowerCase() === "open").length,
    [sortedJobs]
  );

  const totalInProgressJobs = useMemo(
    () =>
      sortedJobs.filter((j) => String(j?.status || "").toLowerCase() === "in_progress").length,
    [sortedJobs]
  );

  const totalNotificationCount = useMemo(() => {
    return totalOpenJobs + totalMessageUnread;
  }, [totalOpenJobs, totalMessageUnread]);

  const notificationItems = useMemo(() => {
    return sortedJobs.filter((j) => {
      const isOpen = String(j?.status || "").toLowerCase() === "open";
      const hasUnread = Number(j?.unread_count || 0) > 0;
      return isOpen || hasUnread;
    });
  }, [sortedJobs]);

  const openMessages = () => {
    const target =
      sortedJobs.find((j) => Number(j?.unread_count || 0) > 0) || sortedJobs[0];

    if (!target?.id) {
      showToast("error", "No messages available yet.");
      return;
    }

    nav(`/provider/chat/${target.id}`);
  };

  const acceptJob = async (jobId) => {
    try {
      await api.patch(`provider/jobs/${jobId}/status/`, { status: "in_progress" });
      showToast("success", "Job accepted.");
      await loadJobs(false);
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to accept job"
      );
    }
  };

  const rejectJob = async (jobId) => {
    try {
      await api.patch(`provider/jobs/${jobId}/status/`, { status: "rejected" });
      showToast("success", "Job rejected.");
      await loadJobs(false);
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to reject job"
      );
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.resolve(logout());
    } finally {
      nav("/", { replace: true });
    }
  };

  const styles = getStyles(isDark);

  return (
    <Shell>
      <div style={styles.page}>
        <Toast
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={styles.heroCard}>
          <div>
            <div style={styles.eyebrow}>SERVICE PROVIDER PORTAL</div>
            <h1 style={styles.heroTitle}>Service Provider Dashboard</h1>
            <p style={styles.heroSub}>
              View assigned jobs, track requests, and chat with property owners in one place.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button type="button" style={styles.secondaryBtn} onClick={() => nav("/provider")}>
              Dashboard
            </button>

            <button type="button" style={styles.secondaryBtn} onClick={openMessages}>
              Messages
              <span style={styles.badgeRed}>{totalMessageUnread}</span>
            </button>

            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={() => setShowNotificationsPanel((s) => !s)}
            >
              Notifications
              <span style={styles.badgeBlue}>{totalNotificationCount}</span>
            </button>

            <button type="button" style={styles.secondaryBtn} onClick={() => loadJobs(false)}>
              Refresh
            </button>

            <button type="button" style={styles.primaryBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Jobs</div>
            <div style={styles.statValue}>{sortedJobs.length}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Open Requests</div>
            <div style={{ ...styles.statValue, color: isDark ? "#93c5fd" : "#2563eb" }}>
              {totalOpenJobs}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>In Progress</div>
            <div style={{ ...styles.statValue, color: isDark ? "#fdba74" : "#ea580c" }}>
              {totalInProgressJobs}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Unread Messages</div>
            <div style={{ ...styles.statValue, color: isDark ? "#fca5a5" : "#dc2626" }}>
              {totalMessageUnread}
            </div>
          </div>
        </div>

        {showNotificationsPanel && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelTitle}>Notifications</div>
                <div style={styles.panelSub}>
                  See new owner messages and newly assigned maintenance requests.
                </div>
              </div>

              <button
                type="button"
                style={styles.panelCloseBtn}
                onClick={() => setShowNotificationsPanel(false)}
              >
                Close
              </button>
            </div>

            {notificationItems.length === 0 ? (
              <div style={styles.emptyBox}>No notifications right now.</div>
            ) : (
              <div style={styles.cardsGrid}>
                {notificationItems.map((j) => {
                  const hasUnread = Number(j?.unread_count || 0) > 0;
                  const isOpen = String(j?.status || "").toLowerCase() === "open";
                  const statusUi = statusStyles(j?.status, isDark);

                  return (
                    <div key={`notif-${j.id}`} style={styles.jobCard}>
                      <div style={styles.jobTop}>
                        <div style={styles.jobTitleWrap}>
                          <div style={styles.jobTitle}>{j.title || `Job #${j.id}`}</div>

                          {isOpen ? <span style={styles.requestBadge}>New Request</span> : null}
                          {hasUnread ? (
                            <span style={styles.unreadBadge}>
                              {Number(j?.unread_count || 0)} New
                            </span>
                          ) : null}
                        </div>

                        <span
                          style={{
                            ...styles.statusPill,
                            color: statusUi.color,
                            background: statusUi.background,
                            border: statusUi.border,
                          }}
                        >
                          {statusUi.label}
                        </span>
                      </div>

                      {j.description ? <div style={styles.desc}>{j.description}</div> : null}

                      <div style={styles.metaList}>
                        <div><b>Owner:</b> {j.owner_name || "Owner"}</div>
                        <div>
                          <b>Last update:</b>{" "}
                          {formatDate(j.last_message_at || j.updated_at || j.created_at) || "—"}
                        </div>
                        {j.last_message ? (
                          <div><b>Last message:</b> {j.last_message}</div>
                        ) : null}
                      </div>

                      <div style={styles.cardActions}>
                        <button
                          type="button"
                          onClick={() => acceptJob(j.id)}
                          style={styles.acceptBtn}
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectJob(j.id)}
                          style={styles.rejectBtn}
                        >
                          Reject
                        </button>

                        <button
                          type="button"
                          onClick={() => nav(`/provider/chat/${j.id}`)}
                          style={styles.chatBtn}
                        >
                          Open Chat
                        </button>
                      </div>

                      {hasUnread ? (
                        <div style={styles.noticeRed}>
                          New message from {j.owner_name || "owner"}.
                        </div>
                      ) : isOpen ? (
                        <div style={styles.noticeBlue}>
                          New maintenance request assigned by {j.owner_name || "owner"}.
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          {loading ? (
            <div style={styles.emptyBox}>Loading jobs...</div>
          ) : sortedJobs.length === 0 ? (
            <div style={styles.emptyBox}>No jobs assigned yet.</div>
          ) : (
            <div style={styles.cardsGrid}>
              {sortedJobs.map((j) => {
                const unreadCount = Number(j?.unread_count || 0);
                const hasUnread = unreadCount > 0;
                const isOpen = String(j?.status || "").toLowerCase() === "open";
                const statusUi = statusStyles(j?.status, isDark);

                return (
                  <div key={j.id} style={styles.jobCard}>
                    <div style={styles.jobTop}>
                      <div style={styles.jobTitleWrap}>
                        <div style={styles.jobTitle}>{j.title || `Job #${j.id}`}</div>

                        {isOpen ? <span style={styles.requestBadge}>New Request</span> : null}
                        {hasUnread ? (
                          <span style={styles.unreadBadge}>{unreadCount} New</span>
                        ) : null}
                      </div>

                      <span
                        style={{
                          ...styles.statusPill,
                          color: statusUi.color,
                          background: statusUi.background,
                          border: statusUi.border,
                        }}
                      >
                        {statusUi.label}
                      </span>
                    </div>

                    {j.description ? <div style={styles.desc}>{j.description}</div> : null}

                    <div style={styles.metaList}>
                      <div><b>Owner:</b> {j.owner_name || "Owner"}</div>
                      <div>
                        <b>Last update:</b>{" "}
                        {formatDate(j.last_message_at || j.updated_at || j.created_at) || "—"}
                      </div>
                      {j.last_message ? (
                        <div><b>Last message:</b> {j.last_message}</div>
                      ) : null}
                    </div>

                    <div style={styles.cardActions}>
                      <button
                        type="button"
                        onClick={() => acceptJob(j.id)}
                        style={styles.acceptBtn}
                      >
                        Accept
                      </button>

                      <button
                        type="button"
                        onClick={() => rejectJob(j.id)}
                        style={styles.rejectBtn}
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => nav(`/provider/chat/${j.id}`)}
                        style={styles.chatBtn}
                      >
                        Open Chat
                      </button>
                    </div>

                    {hasUnread ? (
                      <div style={styles.noticeRed}>
                        New message from {j.owner_name || "owner"}.
                      </div>
                    ) : isOpen ? (
                      <div style={styles.noticeBlue}>
                        New maintenance request assigned by {j.owner_name || "owner"}.
                      </div>
                    ) : j.status === "rejected" ? (
                      <div style={styles.helperText}>
                        This job is currently rejected. You can still accept it again later.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function getStyles(isDark) {
  return {
    page: {
      width: "100%",
      maxWidth: "1440px",
      margin: "0 auto",
      padding: "24px 28px 40px",
      boxSizing: "border-box",
    },

    heroCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap",
      padding: 28,
      borderRadius: 28,
      background: isDark
        ? "linear-gradient(135deg, #12355d 0%, #173f6e 55%, #102b49 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #f7f7ff 100%)",
      border: isDark ? "1px solid rgba(96,165,250,0.16)" : "1px solid #ececf4",
      boxShadow: isDark
        ? "0 16px 40px rgba(2,12,30,0.35)"
        : "0 16px 40px rgba(20,20,40,0.08)",
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: 800,
      color: isDark ? "#93c5fd" : "#8a8aa3",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginBottom: 8,
    },

    heroTitle: {
      margin: 0,
      fontSize: 38,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#171725",
      lineHeight: 1.15,
    },

    heroSub: {
      margin: "10px 0 0 0",
      fontSize: 16,
      color: isDark ? "#cbd5e1" : "#66667d",
      lineHeight: 1.6,
      maxWidth: 760,
    },

    heroActions: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
    },

    secondaryBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 16px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(96,165,250,0.18)" : "1px solid #e5e7ef",
      background: isDark ? "#17395f" : "#ffffff",
      color: isDark ? "#eff6ff" : "#2a2a3a",
      fontWeight: 800,
      cursor: "pointer",
      boxShadow: isDark
        ? "0 8px 18px rgba(2,12,30,0.18)"
        : "0 6px 18px rgba(15,15,25,0.04)",
    },

    primaryBtn: {
      padding: "12px 18px",
      borderRadius: 14,
      border: "none",
      background: isDark
        ? "linear-gradient(135deg, #38bdf8, #60a5fa)"
        : "linear-gradient(135deg, #6d28d9, #8b5cf6)",
      color: isDark ? "#082f49" : "#ffffff",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: isDark
        ? "0 12px 28px rgba(56,189,248,0.22)"
        : "0 12px 28px rgba(124,58,237,0.22)",
    },

    badgeRed: {
      minWidth: 22,
      height: 22,
      padding: "0 7px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ef4444",
      color: "#fff",
      fontSize: 12,
      fontWeight: 900,
    },

    badgeBlue: {
      minWidth: 22,
      height: 22,
      padding: "0 7px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: isDark ? "#38bdf8" : "#3b82f6",
      color: "#fff",
      fontSize: 12,
      fontWeight: 900,
    },

    statsGrid: {
      marginTop: 20,
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 16,
    },

    statCard: {
      background: isDark ? "#102d50" : "#ffffff",
      border: isDark ? "1px solid rgba(96,165,250,0.12)" : "1px solid #ececf3",
      borderRadius: 22,
      padding: 20,
      boxShadow: isDark
        ? "0 10px 28px rgba(2,12,30,0.22)"
        : "0 10px 28px rgba(20,20,40,0.06)",
    },

    statLabel: {
      fontSize: 12,
      fontWeight: 800,
      color: isDark ? "#93c5fd" : "#8a8aa0",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },

    statValue: {
      marginTop: 10,
      fontSize: 32,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#151523",
    },

    panel: {
      marginTop: 20,
      padding: 20,
      borderRadius: 24,
      background: isDark ? "#102d50" : "#ffffff",
      border: isDark ? "1px solid rgba(96,165,250,0.12)" : "1px solid #ececf3",
      boxShadow: isDark
        ? "0 14px 36px rgba(2,12,30,0.24)"
        : "0 14px 36px rgba(20,20,40,0.07)",
    },

    panelHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 14,
    },

    panelTitle: {
      fontSize: 22,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#171725",
    },

    panelSub: {
      marginTop: 4,
      fontSize: 14,
      color: isDark ? "#cbd5e1" : "#6b6b82",
    },

    panelCloseBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: isDark ? "1px solid rgba(96,165,250,0.18)" : "1px solid #e5e7ef",
      background: isDark ? "#17395f" : "#ffffff",
      color: isDark ? "#eff6ff" : "#33354a",
      fontWeight: 800,
      cursor: "pointer",
    },

    emptyBox: {
      padding: 20,
      borderRadius: 18,
      background: isDark ? "#102d50" : "#ffffff",
      border: isDark ? "1px solid rgba(96,165,250,0.12)" : "1px solid #ececf3",
      color: isDark ? "#cbd5e1" : "#67677e",
      fontWeight: 600,
      boxShadow: isDark
        ? "0 10px 24px rgba(2,12,30,0.2)"
        : "0 10px 24px rgba(20,20,40,0.05)",
    },

    cardsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 18,
    },

    jobCard: {
      background: isDark ? "#102d50" : "#ffffff",
      border: isDark ? "1px solid rgba(96,165,250,0.12)" : "1px solid #ececf3",
      borderRadius: 22,
      padding: 18,
      boxShadow: isDark
        ? "0 14px 34px rgba(2,12,30,0.22)"
        : "0 14px 34px rgba(20,20,40,0.06)",
    },

    jobTop: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },

    jobTitleWrap: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },

    jobTitle: {
      fontSize: 24,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#161625",
      lineHeight: 1.2,
    },

    statusPill: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },

    desc: {
      marginTop: 12,
      fontSize: 15,
      color: isDark ? "#dbeafe" : "#3d3d52",
      lineHeight: 1.55,
    },

    metaList: {
      marginTop: 14,
      display: "grid",
      gap: 8,
      fontSize: 14,
      color: isDark ? "#cbd5e1" : "#525269",
      lineHeight: 1.5,
    },

    cardActions: {
      marginTop: 16,
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
    },

    acceptBtn: {
      padding: "12px 16px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(74,222,128,0.26)" : "1px solid #bbf7d0",
      background: isDark ? "#153928" : "#dcfce7",
      color: isDark ? "#bbf7d0" : "#166534",
      fontWeight: 900,
      cursor: "pointer",
    },

    rejectBtn: {
      padding: "12px 16px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(248,113,113,0.26)" : "1px solid #fecaca",
      background: isDark ? "#4a1f24" : "#fee2e2",
      color: isDark ? "#fecaca" : "#b91c1c",
      fontWeight: 900,
      cursor: "pointer",
    },

    chatBtn: {
      padding: "12px 18px",
      borderRadius: 14,
      border: "none",
      background: isDark
        ? "linear-gradient(135deg, #38bdf8, #60a5fa)"
        : "linear-gradient(135deg, #7c3aed, #8b5cf6)",
      color: isDark ? "#082f49" : "#ffffff",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: isDark
        ? "0 10px 24px rgba(56,189,248,0.18)"
        : "0 10px 24px rgba(124,58,237,0.18)",
    },

    helperText: {
      marginTop: 10,
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#74748b",
      fontWeight: 600,
    },

    noticeRed: {
      marginTop: 10,
      fontSize: 12,
      color: isDark ? "#fca5a5" : "#b91c1c",
      fontWeight: 800,
    },

    noticeBlue: {
      marginTop: 10,
      fontSize: 12,
      color: isDark ? "#93c5fd" : "#1d4ed8",
      fontWeight: 800,
    },

    unreadBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 56,
      padding: "5px 10px",
      borderRadius: 999,
      background: isDark ? "#4a1f24" : "#fee2e2",
      border: isDark ? "1px solid rgba(248,113,113,0.26)" : "1px solid #fecaca",
      color: isDark ? "#fecaca" : "#b91c1c",
      fontSize: 12,
      fontWeight: 900,
    },

    requestBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 92,
      padding: "5px 10px",
      borderRadius: 999,
      background: isDark ? "#1e3a5f" : "#dbeafe",
      border: isDark ? "1px solid rgba(96,165,250,0.26)" : "1px solid #bfdbfe",
      color: isDark ? "#bfdbfe" : "#1d4ed8",
      fontSize: 12,
      fontWeight: 900,
    },

    "@media (max-width: 1100px)": {},
  };
}