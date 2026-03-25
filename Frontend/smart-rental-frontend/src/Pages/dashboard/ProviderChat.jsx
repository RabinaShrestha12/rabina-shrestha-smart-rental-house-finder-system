import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

function normalizeRole(v) {
  return String(v || "").trim().toLowerCase();
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function arrify(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.chat)) return data.chat;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.messages)) return data.data.messages;
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

function getInitials(name) {
  const txt = String(name || "").trim();
  if (!txt) return "?";
  const parts = txt.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getMsgId(m, i) {
  return m?.id ?? m?.message_id ?? m?.pk ?? `${i}`;
}

function getMsgText(m) {
  return m?.message ?? m?.text ?? m?.body ?? m?.content ?? m?.reply ?? "";
}

function getMsgCreatedAt(m) {
  return m?.created_at ?? m?.created ?? m?.timestamp ?? m?.sent_at ?? "";
}

function getBackendBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  );
}

function buildFullMediaUrl(raw) {
  if (!raw) return "";

  const value = String(raw).trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${getBackendBaseUrl()}${value}`;
  }

  if (value.startsWith("media/")) {
    return `${getBackendBaseUrl()}/${value}`;
  }

  return `${getBackendBaseUrl()}/media/${value}`;
}

function getMsgImage(m) {
  const raw =
    m?.image_url ||
    m?.image ||
    m?.picture ||
    m?.photo ||
    m?.file ||
    m?.attachment ||
    m?.media ||
    m?.media_url ||
    "";

  return buildFullMediaUrl(raw);
}

function getRawSenderRole(m) {
  return normalizeRole(
    m?.sender_role ??
      m?.role ??
      m?.sender?.role ??
      m?.user_role ??
      m?.sender_type ??
      m?.author_role ??
      m?.from_role ??
      ""
  );
}

function getRawSenderName(m) {
  return (
    m?.sender_name ||
    m?.sender?.name ||
    m?.sender?.username ||
    m?.sender?.email ||
    m?.author_name ||
    m?.from_name ||
    m?.owner_name ||
    m?.provider_name ||
    m?.user_name ||
    m?.username ||
    ""
  );
}

function getJobOwnerName(job) {
  return (
    job?.owner_name ||
    job?.owner?.username ||
    job?.owner?.name ||
    job?.owner?.email ||
    "Owner"
  );
}

function getJobProviderName(job) {
  return (
    job?.provider_name ||
    job?.provider?.username ||
    job?.provider?.name ||
    job?.provider?.email ||
    job?.service_provider?.username ||
    job?.service_provider?.name ||
    job?.service_provider?.email ||
    "Service Provider"
  );
}

function getJobTitle(job, jobId) {
  return (
    job?.title ||
    job?.issue_title ||
    job?.subject ||
    job?.service_title ||
    `Job #${jobId}`
  );
}

function getJobDescription(job) {
  return (
    job?.description ||
    job?.issue_description ||
    job?.details ||
    job?.message ||
    ""
  );
}

function isProviderRole(role) {
  const r = normalizeRole(role);
  return (
    r === "provider" ||
    r === "service_provider" ||
    r === "service provider"
  );
}

function isOwnerRole(role) {
  return normalizeRole(role) === "owner";
}

function normalizeMessageMine(message, currentRole, currentEmail = "") {
  const senderRole = getRawSenderRole(message);
  const senderName = String(getRawSenderName(message) || "").toLowerCase();
  const emailLc = String(currentEmail || "").toLowerCase();

  if (typeof message?.is_mine === "boolean") return message.is_mine;

  if (isOwnerRole(currentRole)) {
    if (isOwnerRole(senderRole)) return true;
    if (emailLc && senderName.includes(emailLc)) return true;
    return false;
  }

  if (isProviderRole(currentRole)) {
    if (isProviderRole(senderRole)) return true;
    if (emailLc && senderName.includes(emailLc)) return true;
    return false;
  }

  return false;
}

function resolveSenderName(message, job, currentRole, currentEmail) {
  const raw = getRawSenderName(message);
  if (raw) return raw;

  const senderRole = getRawSenderRole(message);

  if (isOwnerRole(senderRole)) return getJobOwnerName(job);
  if (isProviderRole(senderRole)) return getJobProviderName(job);

  const mine = normalizeMessageMine(message, currentRole, currentEmail);
  if (mine) {
    return isOwnerRole(currentRole) ? getJobOwnerName(job) : getJobProviderName(job);
  }

  return isOwnerRole(currentRole) ? getJobProviderName(job) : getJobOwnerName(job);
}

function resolveSenderRoleLabel(message, currentRole, currentEmail) {
  const senderRole = getRawSenderRole(message);

  if (isOwnerRole(senderRole)) return "Owner";
  if (isProviderRole(senderRole)) return "Provider";

  const mine = normalizeMessageMine(message, currentRole, currentEmail);
  if (mine) return isOwnerRole(currentRole) ? "Owner" : "Provider";

  return isOwnerRole(currentRole) ? "Provider" : "Owner";
}

export default function ProviderChat() {
  const { role, logout, booting, email } = useAuth();
  const nav = useNavigate();
  const { jobId } = useParams();

  const storedUser = useMemo(() => readStoredUser(), []);
  const currentRole = useMemo(
    () =>
      normalizeRole(
        role ||
          localStorage.getItem("role") ||
          storedUser?.role ||
          ""
      ),
    [role, storedUser]
  );

  const isOwnerView = isOwnerRole(currentRole);
  const isProviderView = isProviderRole(currentRole);

  const currentEmail =
    email ||
    storedUser?.email ||
    localStorage.getItem("email") ||
    localStorage.getItem("username") ||
    "";

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const ownerName = useMemo(() => getJobOwnerName(job), [job]);
  const providerName = useMemo(() => getJobProviderName(job), [job]);

  const showToast = (type, msg) => setToast({ type, msg });

  const detailEndpoints = useMemo(() => {
    if (isOwnerView) {
      return [
        `owner/provider-chat/${jobId}/`,
        `owner/provider-chat/${jobId}`,
        `owner/provider-messages/${jobId}/`,
        `owner/provider-messages/${jobId}`,
        `owner/maintenance/${jobId}/`,
        `owner/maintenance/${jobId}`,
      ];
    }

    return [
      `provider/jobs/${jobId}/`,
      `provider/jobs/${jobId}`,
      `provider/chat/${jobId}/`,
      `provider/chat/${jobId}`,
      `provider/maintenance/${jobId}/`,
      `provider/maintenance/${jobId}`,
    ];
  }, [isOwnerView, jobId]);

  const listEndpoints = useMemo(() => {
    if (isOwnerView) {
      return [];
    }
    return ["provider/jobs/", "provider/jobs"];
  }, [isOwnerView]);

  const messageEndpoints = useMemo(() => {
    if (isOwnerView) {
      return [
        `owner/provider-chat/${jobId}/messages/`,
        `owner/provider-chat/${jobId}/messages`,
        `owner/provider-messages/${jobId}/messages/`,
        `owner/provider-messages/${jobId}/messages`,
        `owner/provider-messages/${jobId}/`,
        `owner/provider-messages/${jobId}`,
        `owner/maintenance/${jobId}/messages/`,
        `owner/maintenance/${jobId}/messages`,
      ];
    }

    return [
      `provider/chat/${jobId}/messages/`,
      `provider/chat/${jobId}/messages`,
      `provider/maintenance/${jobId}/messages/`,
      `provider/maintenance/${jobId}/messages`,
      `provider/chat/${jobId}/`,
      `provider/chat/${jobId}`,
    ];
  }, [isOwnerView, jobId]);

  const sendEndpoints = useMemo(() => {
    if (isOwnerView) {
      return [
        `owner/provider-chat/${jobId}/send/`,
        `owner/provider-chat/${jobId}/send`,
        `owner/provider-messages/${jobId}/send/`,
        `owner/provider-messages/${jobId}/send`,
        `owner/maintenance/${jobId}/messages/send/`,
        `owner/maintenance/${jobId}/messages/`,
      ];
    }

    return [
      `provider/chat/${jobId}/send/`,
      `provider/chat/${jobId}/send`,
      `provider/maintenance/${jobId}/messages/send/`,
      `provider/maintenance/${jobId}/messages/`,
    ];
  }, [isOwnerView, jobId]);

  const statusEndpoints = useMemo(() => {
    return [
      `provider/jobs/${jobId}/status/`,
      `provider/jobs/${jobId}/status`,
      `provider/chat/${jobId}/status/`,
      `provider/chat/${jobId}/status`,
      `provider/maintenance/${jobId}/status/`,
      `provider/maintenance/${jobId}/status`,
    ];
  }, [jobId]);

  const tryGet = async (urls) => {
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await api.get(url);
        return res.data;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  };

  const tryPost = async (urls, body, config = {}) => {
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await api.post(url, body, config);
        return res.data;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  };

  const tryPatch = async (urls, body) => {
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await api.patch(url, body);
        return res.data;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  };

  const normalizeJob = (raw) => {
    const obj = raw?.job || raw?.request || raw?.maintenance || raw?.data || raw || {};
    return {
      ...obj,
      id: obj?.id ?? obj?.job_id ?? obj?.request_id ?? jobId,
      title: getJobTitle(obj, jobId),
      description: getJobDescription(obj),
      status: obj?.status || obj?.job_status || obj?.state || "-",
      owner_name: getJobOwnerName(obj),
      provider_name: getJobProviderName(obj),
    };
  };

  const normalizeMessages = (raw) => {
    const list = arrify(raw);
    const sorted = [...list].sort((a, b) =>
      String(getMsgCreatedAt(a)).localeCompare(String(getMsgCreatedAt(b)))
    );
    return sorted;
  };

  const loadJobInfo = async () => {
    try {
      if (detailEndpoints.length > 0) {
        const data = await tryGet(detailEndpoints);
        const normalized = normalizeJob(data);
        setJob(normalized);

        const maybeMessages =
          data?.messages ||
          data?.results ||
          data?.chat ||
          data?.data?.messages ||
          null;

        if (maybeMessages) {
          setMessages(normalizeMessages(maybeMessages));
        }
        return;
      }

      throw new Error("No detail endpoints");
    } catch {
      try {
        if (listEndpoints.length > 0) {
          const data = await tryGet(listEndpoints);
          const jobs = arrify(data);
          const found = jobs.find((j) => String(j?.id) === String(jobId));
          if (found) {
            setJob(normalizeJob(found));
            return;
          }
        }
      } catch {
        // ignore
      }

      setJob({
        id: jobId,
        title: `Job #${jobId}`,
        description: "",
        status: "-",
        owner_name: "Owner",
        provider_name: "Service Provider",
      });
    }
  };

  const loadMessages = async (showLoader = true) => {
    if (!jobId) {
      showToast("error", "Job id is missing.");
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const data = await tryGet(messageEndpoints);
      setMessages(normalizeMessages(data));
    } catch (e) {
      if (showLoader) {
        showToast(
          "error",
          e?.response?.data?.detail ||
            e?.response?.data?.error ||
            "Failed to load messages."
        );
      }
      setMessages([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (booting) return;

    if (!isOwnerView && !isProviderView) {
      showToast("error", "You are not authorized to access this chat.");
      setLoading(false);
      return;
    }

    loadJobInfo();
    loadMessages(true);

    const timer = setInterval(() => {
      loadMessages(false);
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, currentRole, jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select a valid image file.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    const clean = String(text || "").trim();

    if (!clean && !selectedImage) {
      showToast("error", "Please write a message or choose an image first.");
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("message", clean);
      formData.append("text", clean);
      formData.append("body", clean);
      formData.append("content", clean);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      await tryPost(sendEndpoints, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setText("");
      clearSelectedImage();
      showToast("success", "Message sent.");
      await loadMessages(false);
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (nextStatus) => {
    if (!isProviderView) return;

    setStatusSaving(true);
    try {
      await tryPatch(statusEndpoints, { status: nextStatus, job_status: nextStatus });
      showToast("success", `Status updated to ${nextStatus}.`);
      await loadJobInfo();
    } catch (patchErr) {
      try {
        await tryPost(statusEndpoints, { status: nextStatus, job_status: nextStatus });
        showToast("success", `Status updated to ${nextStatus}.`);
        await loadJobInfo();
      } catch (postErr) {
        showToast(
          "error",
          postErr?.response?.data?.detail ||
            postErr?.response?.data?.error ||
            patchErr?.response?.data?.detail ||
            patchErr?.response?.data?.error ||
            "Failed to update status."
        );
      }
    } finally {
      setStatusSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.resolve(logout());
    } finally {
      nav("/", { replace: true });
    }
  };

  const goDashboard = () => {
    if (isOwnerView) {
      nav("/owner");
      return;
    }
    nav("/provider");
  };

  const goMaintenance = () => {
    if (isOwnerView) {
      nav("/owner/maintenance");
      return;
    }
    nav("/provider");
  };

  return (
    <Shell>
      <div style={styles.page}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={styles.headerCard}>
          <div>
            <div style={styles.topLabel}>
              {isOwnerView ? "Owner Communication" : "Provider Communication"}
            </div>
            <h2 style={styles.pageTitle}>
              {isOwnerView ? "Owner Provider Chat" : "Provider Chat"}{" "}
              {job?.id ? `• Job #${job.id}` : ""}
            </h2>
            <div style={styles.pageSub}>
              {isOwnerView
                ? "Talk directly with the service provider about this maintenance request."
                : "Talk directly with the owner about this maintenance request."}
            </div>
          </div>

          <div style={styles.topBtns}>
            <button type="button" style={styles.btnGhost} onClick={goDashboard}>
              Dashboard
            </button>
            <button type="button" style={styles.btnGhost} onClick={() => nav("/")}>
              Home
            </button>
            <button type="button" style={styles.btnGhost} onClick={() => loadMessages(true)}>
              Refresh
            </button>
            <button type="button" style={styles.btnPrimary} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryLeft}>
            <div style={styles.jobTitle}>{job?.title || `Job #${jobId}`}</div>

            {job?.description ? (
              <div style={styles.jobDesc}>{job.description}</div>
            ) : null}

            <div style={styles.metaRow}>
              <span style={styles.metaChip}>
                {isOwnerView ? "Provider:" : "Owner:"}
                <b style={{ marginLeft: 6 }}>
                  {isOwnerView ? providerName : ownerName}
                </b>
              </span>

              <span style={styles.metaChip}>
                Status:
                <span style={styles.statusPill}>{job?.status || "—"}</span>
              </span>
            </div>
          </div>

          {isProviderView ? (
            <div style={styles.quickActions}>
              <button
                type="button"
                style={styles.actionBtn}
                disabled={statusSaving}
                onClick={() => updateStatus("in_progress")}
              >
                Mark In Progress
              </button>

              <button
                type="button"
                style={styles.actionBtn}
                disabled={statusSaving}
                onClick={() => updateStatus("completed")}
              >
                Mark Completed
              </button>

              <button
                type="button"
                style={styles.actionBtnDanger}
                disabled={statusSaving}
                onClick={() => updateStatus("rejected")}
              >
                Reject
              </button>
            </div>
          ) : (
            <div style={styles.quickActions}>
              <button
                type="button"
                style={styles.actionBtn}
                onClick={goMaintenance}
              >
                Maintenance
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={styles.infoBox}>Loading chat...</div>
        ) : (
          <>
            <div style={styles.chatPanel}>
              <div style={styles.chatHeader}>
                <div style={styles.chatHeaderLeft}>
                  <div style={styles.avatarOwner}>
                    {getInitials(isOwnerView ? providerName : ownerName)}
                  </div>
                  <div>
                    <div style={styles.chatHeaderTitle}>
                      {isOwnerView ? providerName : ownerName}
                    </div>
                    <div style={styles.chatHeaderSub}>
                      {isOwnerView ? "Service provider conversation" : "Owner conversation"}
                    </div>
                  </div>
                </div>

                <div style={styles.chatHeaderRight}>
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </div>
              </div>

              <div style={styles.chatBox}>
                {messages.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>💬</div>
                    <div style={styles.emptyTitle}>No messages yet</div>
                    <div style={styles.emptyText}>
                      {isOwnerView
                        ? "When the service provider sends a message, it will appear here. You can also send the first message below."
                        : "When the owner sends a message, it will appear here. You can also send the first message below."}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const mine = normalizeMessageMine(m, currentRole, currentEmail);
                    const senderName = resolveSenderName(m, job, currentRole, currentEmail);
                    const senderRole = resolveSenderRoleLabel(m, currentRole, currentEmail);
                    const msgImage = getMsgImage(m);

                    return (
                      <div
                        key={getMsgId(m, i)}
                        style={{
                          ...styles.messageRow,
                          justifyContent: mine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageWrap,
                            flexDirection: mine ? "row-reverse" : "row",
                          }}
                        >
                          <div
                            style={
                              mine ? styles.avatarMineSmall : styles.avatarOtherSmall
                            }
                          >
                            {getInitials(senderName)}
                          </div>

                          <div
                            style={{
                              ...styles.bubble,
                              ...(mine ? styles.bubbleMine : styles.bubbleOther),
                            }}
                          >
                            <div style={styles.senderRow}>
                              <span style={styles.senderName}>{senderName}</span>
                              <span style={styles.senderRole}>{senderRole}</span>
                            </div>

                            {msgImage ? (
                              <div style={styles.imageWrap}>
                                <img
                                  src={msgImage}
                                  alt="chat upload"
                                  style={styles.messageImage}
                                  onError={(e) => {
                                    console.log("ProviderChat image failed:", msgImage, m);
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            ) : null}

                            {getMsgText(m) ? (
                              <div style={styles.bubbleText}>
                                {getMsgText(m)}
                              </div>
                            ) : null}

                            <div style={styles.bubbleTime}>
                              {formatDate(getMsgCreatedAt(m))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div style={styles.composerCard}>
              <div style={styles.composerTop}>
                <div style={styles.composerTitle}>
                  Reply to {isOwnerView ? providerName : ownerName}
                </div>
                <div style={styles.composerHint}>
                  Keep the communication clear and professional.
                </div>
              </div>

              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Write your message to ${
                  isOwnerView ? providerName : ownerName
                }...`}
                style={styles.textarea}
              />

              <div style={styles.uploadRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={styles.fileInput}
                />

                <button
                  type="button"
                  style={styles.btnGhost}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  Choose Image
                </button>

                {selectedImage ? (
                  <span style={styles.fileName}>{selectedImage.name}</span>
                ) : (
                  <span style={styles.fileHint}>No image selected</span>
                )}
              </div>

              {imagePreview ? (
                <div style={styles.previewCard}>
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={styles.previewImage}
                  />
                  <button
                    type="button"
                    style={styles.removeImageBtn}
                    onClick={clearSelectedImage}
                    disabled={sending}
                  >
                    Remove Image
                  </button>
                </div>
              ) : null}

              <div style={styles.composerActions}>
                <button
                  type="button"
                  style={styles.btnGhost}
                  onClick={() => {
                    setText("");
                    clearSelectedImage();
                  }}
                  disabled={sending}
                >
                  Clear
                </button>

                <button
                  type="button"
                  style={styles.btnPrimary}
                  onClick={sendMessage}
                  disabled={sending}
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

const styles = {
  page: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 20,
  },

  headerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    padding: 18,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
  },

  topLabel: {
    fontSize: 12,
    opacity: 0.72,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  pageTitle: {
    margin: "4px 0 6px",
    fontSize: 30,
    fontWeight: 900,
  },

  pageSub: {
    opacity: 0.82,
    fontSize: 15,
  },

  topBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  btnGhost: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },

  btnPrimary: {
    padding: "11px 18px",
    borderRadius: 14,
    border: "1px solid rgba(124,58,237,0.55)",
    background: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 10px 24px rgba(109,40,217,0.25)",
  },

  summaryCard: {
    marginTop: 16,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    padding: 18,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  },

  summaryLeft: {
    display: "grid",
    gap: 8,
  },

  jobTitle: {
    fontSize: 20,
    fontWeight: 900,
  },

  jobDesc: {
    opacity: 0.85,
    lineHeight: 1.55,
  },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },

  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 13,
  },

  statusPill: {
    marginLeft: 8,
    padding: "5px 10px",
    borderRadius: 999,
    background: "rgba(124,58,237,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 800,
  },

  quickActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  actionBtn: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(124,58,237,0.35)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },

  actionBtnDanger: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(239,68,68,0.35)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },

  infoBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    opacity: 0.9,
  },

  chatPanel: {
    marginTop: 16,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },

  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: "16px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  },

  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  avatarOwner: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "linear-gradient(135deg, #22c55e, #06b6d4)",
    color: "white",
    boxShadow: "0 8px 18px rgba(6,182,212,0.18)",
  },

  chatHeaderTitle: {
    fontWeight: 900,
    fontSize: 18,
  },

  chatHeaderSub: {
    fontSize: 13,
    opacity: 0.72,
  },

  chatHeaderRight: {
    fontSize: 13,
    opacity: 0.75,
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
  },

  chatBox: {
    minHeight: 430,
    maxHeight: "62vh",
    overflowY: "auto",
    padding: 20,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
  },

  emptyState: {
    minHeight: 320,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 24,
    borderRadius: 18,
    border: "1px dashed rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.02)",
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },

  emptyTitle: {
    fontWeight: 900,
    fontSize: 18,
    marginBottom: 6,
  },

  emptyText: {
    maxWidth: 460,
    opacity: 0.76,
    lineHeight: 1.6,
  },

  messageRow: {
    display: "flex",
    marginBottom: 14,
  },

  messageWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    maxWidth: "88%",
  },

  avatarMineSmall: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
    color: "white",
    flexShrink: 0,
  },

  avatarOtherSmall: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "linear-gradient(135deg,#0ea5e9,#22c55e)",
    color: "white",
    flexShrink: 0,
  },

  bubble: {
    maxWidth: "100%",
    padding: "12px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
  },

  bubbleMine: {
    background:
      "linear-gradient(135deg, rgba(124,58,237,0.32), rgba(139,92,246,0.28))",
    borderTopRightRadius: 8,
  },

  bubbleOther: {
    background: "rgba(255,255,255,0.06)",
    borderTopLeftRadius: 8,
  },

  senderRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },

  senderName: {
    fontWeight: 900,
    fontSize: 14,
  },

  senderRole: {
    fontSize: 11,
    opacity: 0.72,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  bubbleText: {
    lineHeight: 1.65,
    whiteSpace: "pre-wrap",
    fontSize: 15,
    marginTop: 8,
  },

  bubbleTime: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.68,
  },

  imageWrap: {
    marginTop: 6,
  },

  messageImage: {
    maxWidth: 260,
    width: "100%",
    maxHeight: 260,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    display: "block",
  },

  composerCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },

  composerTop: {
    marginBottom: 12,
  },

  composerTitle: {
    fontWeight: 900,
    fontSize: 18,
  },

  composerHint: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.72,
  },

  textarea: {
    width: "100%",
    minHeight: 120,
    resize: "vertical",
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
    fontSize: 15,
    lineHeight: 1.55,
  },

  uploadRow: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  fileInput: {
    display: "none",
  },

  fileName: {
    fontSize: 13,
    opacity: 0.9,
    wordBreak: "break-all",
  },

  fileHint: {
    fontSize: 13,
    opacity: 0.65,
  },

  previewCard: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
  },

  previewImage: {
    maxWidth: 220,
    maxHeight: 220,
    width: "100%",
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
  },

  removeImageBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },

  composerActions: {
    marginTop: 12,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
};