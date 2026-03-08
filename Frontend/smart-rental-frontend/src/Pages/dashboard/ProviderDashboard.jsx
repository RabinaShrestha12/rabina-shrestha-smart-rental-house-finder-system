// src/pages/dashboard/ProviderDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
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

export default function ProviderDashboard() {
  const { role, logout, booting } = useAuth();
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
    if (r !== "provider" && r !== "service_provider") {
      showToast("error", "You are not authorized to access Provider Dashboard.");
      setLoading(false);
      return;
    }

    loadJobs(false);

    const timer = setInterval(() => {
      loadJobs(true);
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, role]);

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    list.sort((a, b) =>
      String(
        b?.last_message_at ||
          b?.updated_at ||
          b?.created_at ||
          ""
      ).localeCompare(
        String(
          a?.last_message_at ||
            a?.updated_at ||
            a?.created_at ||
            ""
        )
      )
    );
    return list;
  }, [jobs]);

  const totalMessageUnread = useMemo(
    () =>
      sortedJobs.reduce(
        (sum, item) => sum + Number(item?.unread_count || 0),
        0
      ),
    [sortedJobs]
  );

  const totalNotificationCount = useMemo(() => {
    const newOpenJobs = sortedJobs.filter(
      (j) => String(j?.status || "").toLowerCase() === "open"
    ).length;

    return newOpenJobs + totalMessageUnread;
  }, [sortedJobs, totalMessageUnread]);

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

  return (
    <Shell>
      <div style={styles.wrap}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={styles.headerRow}>
          <div>
            <h2 style={{ margin: 0 }}>Service Provider Dashboard</h2>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              View assigned maintenance jobs and chat with the owner.
            </div>
          </div>

          <div style={styles.topBtns}>
            <button type="button" style={styles.btnGhost} onClick={() => nav("/")}>
              Home
            </button>

            <button type="button" style={styles.btnGhost} onClick={openMessages}>
              Messages
              <span style={styles.topBadge}>{totalMessageUnread}</span>
            </button>

            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => setShowNotificationsPanel((s) => !s)}
            >
              Notifications
              <span style={styles.topBadge}>{totalNotificationCount}</span>
            </button>

            <button type="button" style={styles.btnGhost} onClick={() => loadJobs(false)}>
              Refresh
            </button>

            <button type="button" style={styles.btnPrimary} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {showNotificationsPanel && (
          <div style={styles.notificationsPanel}>
            <div style={styles.notificationsHeader}>
              <div>
                <div style={styles.notificationsTitle}>Notifications</div>
                <div style={styles.notificationsSub}>
                  See new requests and new owner messages before opening chat.
                </div>
              </div>

              <button
                type="button"
                style={styles.btnGhostSmall}
                onClick={() => setShowNotificationsPanel(false)}
              >
                Close
              </button>
            </div>

            {notificationItems.length === 0 ? (
              <div style={styles.infoBox}>No notifications right now.</div>
            ) : (
              <div style={styles.notificationGrid}>
                {notificationItems.map((j) => {
                  const hasUnread = Number(j?.unread_count || 0) > 0;
                  const isOpen = String(j?.status || "").toLowerCase() === "open";

                  return (
                    <div key={`notif-${j.id}`} style={styles.notificationCard}>
                      <div style={styles.cardTop}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>
                            {j.title || `Job #${j.id}`}
                          </div>

                          {isOpen ? (
                            <span style={styles.requestBadge}>new request</span>
                          ) : null}

                          {hasUnread ? (
                            <span style={styles.unreadBadge}>
                              {Number(j?.unread_count || 0)} new
                            </span>
                          ) : null}
                        </div>

                        <div style={{ opacity: 0.9 }}>
                          Status: <b>{j.status || "—"}</b>
                        </div>
                      </div>

                      {j.description ? (
                        <div style={styles.desc}>{j.description}</div>
                      ) : null}

                      <div style={styles.meta}>
                        <div>
                          <b>Owner:</b> {j.owner_name || "Owner"}
                        </div>

                        <div>
                          <b>Last update:</b>{" "}
                          {formatDate(
                            j.last_message_at || j.updated_at || j.created_at
                          ) || "—"}
                        </div>

                        {j.last_message ? (
                          <div>
                            <b>Last message:</b> {j.last_message}
                          </div>
                        ) : null}
                      </div>

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

                      {hasUnread ? (
                        <div style={styles.helperTextHighlight}>
                          New message from {j.owner_name || "owner"}.
                        </div>
                      ) : isOpen ? (
                        <div style={styles.helperTextHighlightBlue}>
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

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div style={styles.infoBox}>Loading jobs...</div>
          ) : sortedJobs.length === 0 ? (
            <div style={styles.infoBox}>No jobs assigned yet.</div>
          ) : (
            <div style={styles.grid}>
              {sortedJobs.map((j) => {
                const unreadCount = Number(j?.unread_count || 0);
                const hasUnread = unreadCount > 0;
                const isOpen = String(j?.status || "").toLowerCase() === "open";

                return (
                  <div key={j.id} style={styles.card}>
                    <div style={styles.cardTop}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {j.title || `Job #${j.id}`}
                        </div>

                        {isOpen ? (
                          <span style={styles.requestBadge}>new request</span>
                        ) : null}
                      </div>

                      <div style={{ opacity: 0.9 }}>
                        Status: <b>{j.status || "—"}</b>
                      </div>
                    </div>

                    {j.description ? <div style={styles.desc}>{j.description}</div> : null}

                    <div style={styles.meta}>
                      <div>
                        <b>Owner:</b> {j.owner_name || "Owner"}
                      </div>

                      <div>
                        <b>Last update:</b>{" "}
                        {formatDate(j.last_message_at || j.updated_at || j.created_at) || "—"}
                      </div>

                      {j.last_message ? (
                        <div>
                          <b>Last message:</b> {j.last_message}
                        </div>
                      ) : null}
                    </div>

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

                    {hasUnread ? (
                      <div style={styles.helperTextHighlight}>
                        New message from {j.owner_name || "owner"}.
                      </div>
                    ) : isOpen ? (
                      <div style={styles.helperTextHighlightBlue}>
                        New maintenance request assigned by {j.owner_name || "owner"}.
                      </div>
                    ) : j.status === "rejected" ? (
                      <div style={styles.helperText}>
                        This job is currently rejected. You can still accept it again if you want.
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

const styles = {
  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 16,
  },
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
  topBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  btnGhostSmall: {
    padding: "8px 12px",
    borderRadius: 10,
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
  topBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    padding: "0 7px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(239,68,68,0.95)",
    color: "white",
    fontSize: 12,
    fontWeight: 900,
  },
  infoBox: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    opacity: 0.9,
  },
  notificationsPanel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  },
  notificationsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  notificationsTitle: {
    fontSize: 20,
    fontWeight: 900,
  },
  notificationsSub: {
    fontSize: 13,
    opacity: 0.75,
    marginTop: 4,
  },
  notificationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  notificationCard: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.05)",
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
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  desc: {
    marginTop: 10,
    opacity: 0.95,
    lineHeight: 1.45,
  },
  meta: {
    marginTop: 10,
    display: "grid",
    gap: 6,
    fontSize: 13,
    opacity: 0.9,
  },
  actionRow: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.75,
  },
  helperTextHighlight: {
    marginTop: 8,
    fontSize: 12,
    color: "#fca5a5",
    fontWeight: 700,
  },
  helperTextHighlightBlue: {
    marginTop: 8,
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: 700,
  },
  actionBtn: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(124, 58, 237, 0.35)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  unreadBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(239,68,68,0.18)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fecaca",
    fontSize: 12,
    fontWeight: 900,
  },
  requestBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(59,130,246,0.18)",
    border: "1px solid rgba(59,130,246,0.35)",
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 900,
  },
};