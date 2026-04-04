import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
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

  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${getBackendBaseUrl()}${value}`;
  if (value.startsWith("media/")) return `${getBackendBaseUrl()}/${value}`;
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
  return r === "provider" || r === "service_provider" || r === "service provider";
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

function normalizeStatusValue(status) {
  return String(status || "").trim().toLowerCase();
}

function statusConfig(status, isDark) {
  const s = normalizeStatusValue(status);

  if (s === "open") {
    return isDark
      ? {
          label: "Open",
          background: "#163b63",
          color: "#bfdbfe",
          border: "1px solid rgba(96,165,250,0.28)",
        }
      : {
          label: "Open",
          background: "#dbeafe",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
        };
  }

  if (s === "in_progress") {
    return isDark
      ? {
          label: "In Progress",
          background: "#5a3615",
          color: "#fdba74",
          border: "1px solid rgba(251,146,60,0.28)",
        }
      : {
          label: "In Progress",
          background: "#ffedd5",
          color: "#c2410c",
          border: "1px solid #fed7aa",
        };
  }

  if (s === "completed" || s === "resolved") {
    return isDark
      ? {
          label: "Completed",
          background: "#163927",
          color: "#bbf7d0",
          border: "1px solid rgba(74,222,128,0.28)",
        }
      : {
          label: "Completed",
          background: "#dcfce7",
          color: "#166534",
          border: "1px solid #bbf7d0",
        };
  }

  if (s === "rejected") {
    return isDark
      ? {
          label: "Rejected",
          background: "#4b1f25",
          color: "#fecaca",
          border: "1px solid rgba(248,113,113,0.28)",
        }
      : {
          label: "Rejected",
          background: "#fee2e2",
          color: "#b91c1c",
          border: "1px solid #fecaca",
        };
  }

  return isDark
    ? {
        label: status || "Unknown",
        background: "#223a57",
        color: "#e2e8f0",
        border: "1px solid rgba(148,163,184,0.25)",
      }
    : {
        label: status || "Unknown",
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #e5e7eb",
      };
}

export default function ProviderChat() {
  const { role, logout, booting, email } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const nav = useNavigate();
  const { jobId } = useParams();

  const storedUser = useMemo(() => readStoredUser(), []);
  const currentRole = useMemo(
    () =>
      normalizeRole(role || localStorage.getItem("role") || storedUser?.role || ""),
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
  const textareaRef = useRef(null);

  const ownerName = useMemo(() => getJobOwnerName(job), [job]);
  const providerName = useMemo(() => getJobProviderName(job), [job]);
  const chatPersonName = isOwnerView ? providerName : ownerName;
  const normalizedJobStatus = useMemo(() => normalizeStatusValue(job?.status), [job?.status]);
  const jobStatusUi = useMemo(() => statusConfig(job?.status, isDark), [job?.status, isDark]);

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
    if (isOwnerView) return [];
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

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      if (selectedImage) formData.append("image", selectedImage);

      await tryPost(sendEndpoints, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setText("");
      clearSelectedImage();
      showToast("success", "Message sent.");
      await loadMessages(false);
      textareaRef.current?.focus();
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

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) sendMessage();
    }
  };

  const updateStatus = async (nextStatus) => {
    if (!isProviderView) return;

    const currentStatus = normalizeStatusValue(job?.status);

    if (currentStatus === nextStatus) {
      showToast("info", `Status is already ${nextStatus.replace("_", " ")}.`);
      return;
    }

    if (currentStatus === "completed" || currentStatus === "rejected") {
      showToast("info", "This job is already closed. You cannot change the status now.");
      return;
    }

    setStatusSaving(true);

    const previousJob = job;
    setJob((prev) =>
      prev
        ? {
            ...prev,
            status: nextStatus,
          }
        : prev
    );

    try {
      await tryPatch(statusEndpoints, { status: nextStatus, job_status: nextStatus });
      showToast("success", `Status updated to ${nextStatus.replace("_", " ")}.`);
      await loadJobInfo();
    } catch (patchErr) {
      try {
        await tryPost(statusEndpoints, { status: nextStatus, job_status: nextStatus });
        showToast("success", `Status updated to ${nextStatus.replace("_", " ")}.`);
        await loadJobInfo();
      } catch (postErr) {
        setJob(previousJob);
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

  const providerCanMarkProgress =
    isProviderView &&
    normalizedJobStatus !== "in_progress" &&
    normalizedJobStatus !== "completed" &&
    normalizedJobStatus !== "rejected";

  const providerCanMarkCompleted =
    isProviderView &&
    normalizedJobStatus !== "completed" &&
    normalizedJobStatus !== "rejected";

  const providerCanReject =
    isProviderView &&
    normalizedJobStatus !== "completed" &&
    normalizedJobStatus !== "rejected";

  const styles = getStyles(isDark);

  return (
    <Shell>
      <div style={styles.page}>
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={styles.topBanner}>
          <div>
            <div style={styles.topLabel}>
              {isOwnerView ? "Owner Communication" : "Provider Communication"}
            </div>
            <h1 style={styles.topTitle}>
              {isOwnerView ? "Owner Provider Chat" : "Provider Chat"}
            </h1>
            <div style={styles.topSub}>
              Keep all communication, replies, and image sharing in one place.
            </div>
          </div>

          <div style={styles.topButtons}>
            <button type="button" style={styles.secondaryBtn} onClick={goDashboard}>
              Dashboard
            </button>
            <button type="button" style={styles.secondaryBtn} onClick={goMaintenance}>
              Maintenance
            </button>
            <button type="button" style={styles.secondaryBtn} onClick={() => loadMessages(true)}>
              Refresh
            </button>
            <button type="button" style={styles.primaryBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.desktopGrid}>
          <div style={styles.mainChatCard}>
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}>
                <div style={styles.bigAvatar}>{getInitials(chatPersonName)}</div>
                <div>
                  <div style={styles.chatHeaderName}>{chatPersonName}</div>
                  <div style={styles.chatHeaderRole}>
                    {isOwnerView ? "Owner conversation" : "Provider conversation"}
                  </div>
                </div>
              </div>

              <div style={styles.headerRight}>
                <div style={styles.counterPill}>
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div style={styles.messagesArea}>
              {loading ? (
                <div style={styles.loadingBox}>Loading chat...</div>
              ) : messages.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyTitle}>No messages yet</div>
                  <div style={styles.emptyText}>
                    Start the conversation from the message box below.
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
                        <div style={mine ? styles.avatarMineSmall : styles.avatarOtherSmall}>
                          {getInitials(senderName)}
                        </div>

                        <div
                          style={{
                            ...styles.messageBubble,
                            ...(mine ? styles.messageBubbleMine : styles.messageBubbleOther),
                          }}
                        >
                          <div style={styles.senderTop}>
                            <span style={styles.senderName}>{senderName}</span>
                            <span style={styles.senderTime}>
                              {formatDate(getMsgCreatedAt(m))}
                            </span>
                          </div>

                          <div style={styles.senderRoleTag}>{senderRole}</div>

                          {msgImage ? (
                            <div style={styles.imageWrap}>
                              <img
                                src={msgImage}
                                alt="chat upload"
                                style={styles.messageImage}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : null}

                          {getMsgText(m) ? (
                            <div style={styles.messageText}>{getMsgText(m)}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div style={styles.composerSection}>
              <div style={styles.composerTitle}>Send Message</div>

              {imagePreview ? (
                <div style={styles.previewBox}>
                  <div style={styles.previewHeader}>
                    <span style={styles.previewText}>Selected image</span>
                    <button
                      type="button"
                      style={styles.removeImageBtn}
                      onClick={clearSelectedImage}
                      disabled={sending}
                    >
                      Remove
                    </button>
                  </div>
                  <img src={imagePreview} alt="preview" style={styles.previewImage} />
                </div>
              ) : null}

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={`Write your message to ${chatPersonName}...`}
                style={styles.textarea}
                disabled={sending}
              />

              <div style={styles.bottomActions}>
                <div style={styles.leftActions}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={styles.fileInput}
                  />

                  <button
                    type="button"
                    style={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                  >
                    Choose Image
                  </button>

                  <span style={styles.fileText}>
                    {selectedImage ? selectedImage.name : "No image selected"}
                  </span>
                </div>

                <div style={styles.rightActions}>
                  <button
                    type="button"
                    style={styles.clearBtn}
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
                    style={styles.sendBtn}
                    onClick={sendMessage}
                    disabled={sending}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>

              <div style={styles.helperText}>
                Press <strong>Enter</strong> to send. Press <strong>Shift + Enter</strong> for a new line.
              </div>
            </div>
          </div>

          <div style={styles.sidePanel}>
            <div style={styles.infoCard}>
              <div style={styles.infoTitle}>{job?.title || `Job #${jobId}`}</div>

              {job?.description ? (
                <div style={styles.infoDescription}>{job.description}</div>
              ) : (
                <div style={styles.infoMuted}>No additional job description available.</div>
              )}

              <div style={styles.infoGrid}>
                <div style={styles.infoChip}>
                  <span style={styles.infoKey}>Owner</span>
                  <span style={styles.infoValue}>{ownerName}</span>
                </div>

                <div style={styles.infoChip}>
                  <span style={styles.infoKey}>Provider</span>
                  <span style={styles.infoValue}>{providerName}</span>
                </div>
              </div>

              <div style={styles.statusBlock}>
                <span style={styles.infoKey}>Status</span>
                <span
                  style={{
                    ...styles.statusPill,
                    background: jobStatusUi.background,
                    color: jobStatusUi.color,
                    border: jobStatusUi.border,
                  }}
                >
                  {jobStatusUi.label}
                </span>
              </div>
            </div>

            {isProviderView ? (
              <div style={styles.actionCard}>
                <div style={styles.actionTitle}>Quick Actions</div>

                <button
                  type="button"
                  style={{
                    ...styles.progressBtn,
                    ...(!providerCanMarkProgress || statusSaving ? styles.disabledActionBtn : {}),
                  }}
                  disabled={!providerCanMarkProgress || statusSaving}
                  onClick={() => updateStatus("in_progress")}
                >
                  {normalizedJobStatus === "in_progress" ? "Already In Progress" : "Mark In Progress"}
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.completeBtn,
                    ...(!providerCanMarkCompleted || statusSaving ? styles.disabledActionBtn : {}),
                  }}
                  disabled={!providerCanMarkCompleted || statusSaving}
                  onClick={() => updateStatus("completed")}
                >
                  {normalizedJobStatus === "completed" ? "Completed" : "Mark Completed"}
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.rejectBtn,
                    ...(!providerCanReject || statusSaving ? styles.disabledActionBtn : {}),
                  }}
                  disabled={!providerCanReject || statusSaving}
                  onClick={() => updateStatus("rejected")}
                >
                  {normalizedJobStatus === "rejected" ? "Rejected" : "Reject"}
                </button>
              </div>
            ) : (
              <div style={styles.actionCard}>
                <div style={styles.actionTitle}>Communication Tips</div>
                <div style={styles.tipText}>
                  Keep messages clear and professional. You can send text, upload an image,
                  and reply directly from the same chat box.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function getStyles(isDark) {
  return {
    page: {
      maxWidth: 1500,
      margin: "0 auto",
      padding: "20px 22px 28px",
    },

    topBanner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 18,
      flexWrap: "wrap",
      padding: 24,
      borderRadius: 28,
      border: isDark ? "1px solid rgba(80,160,255,0.16)" : "1px solid #dbe7ff",
      background: isDark
        ? "linear-gradient(135deg, #0f345d 0%, #123e6f 52%, #0d2948 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
      boxShadow: isDark
        ? "0 18px 40px rgba(2,12,30,0.32)"
        : "0 16px 34px rgba(20,20,40,0.07)",
    },

    topLabel: {
      fontSize: 12,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: isDark ? "#93c5fd" : "#4f7ddc",
    },

    topTitle: {
      margin: "6px 0 4px",
      fontSize: 30,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#15233c",
    },

    topSub: {
      fontSize: 14,
      color: isDark ? "#d8e7ff" : "#5b6b86",
      lineHeight: 1.6,
    },

    topButtons: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
    },

    secondaryBtn: {
      padding: "11px 16px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(96,165,250,0.18)" : "1px solid #d9e5fb",
      background: isDark ? "#143861" : "#ffffff",
      color: isDark ? "#eff6ff" : "#23406a",
      cursor: "pointer",
      fontWeight: 800,
      boxShadow: isDark
        ? "0 8px 18px rgba(2,12,30,0.16)"
        : "0 6px 16px rgba(20,20,40,0.04)",
    },

    primaryBtn: {
      padding: "11px 18px",
      borderRadius: 14,
      border: "none",
      background: "linear-gradient(135deg,#4db8ff,#69a7ff)",
      color: "#0d2c4b",
      cursor: "pointer",
      fontWeight: 900,
      boxShadow: "0 12px 26px rgba(77,184,255,0.24)",
    },

    desktopGrid: {
      marginTop: 18,
      display: "grid",
      gridTemplateColumns: "minmax(860px, 1.5fr) minmax(300px, 0.65fr)",
      gap: 18,
      alignItems: "start",
    },

    mainChatCard: {
      minHeight: 820,
      display: "flex",
      flexDirection: "column",
      borderRadius: 30,
      overflow: "hidden",
      border: isDark ? "1px solid rgba(80,160,255,0.16)" : "1px solid #dbe7ff",
      background: isDark
        ? "linear-gradient(180deg, #102f54 0%, #0d2747 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
      boxShadow: isDark
        ? "0 18px 38px rgba(2,12,30,0.3)"
        : "0 16px 34px rgba(20,20,40,0.08)",
    },

    chatHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
      padding: "20px 22px",
      borderBottom: isDark ? "1px solid rgba(80,160,255,0.18)" : "1px solid #dbe7ff",
      background: isDark
        ? "linear-gradient(180deg, #133961 0%, #103152 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%)",
    },

    chatHeaderLeft: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },

    bigAvatar: {
      width: 48,
      height: 48,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      background: "linear-gradient(135deg,#47c0ff,#5f9dff)",
      color: "#0d2c4b",
      boxShadow: "0 10px 22px rgba(77,184,255,0.26)",
      flexShrink: 0,
    },

    chatHeaderName: {
      fontSize: 18,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#15304f",
    },

    chatHeaderRole: {
      fontSize: 13,
      color: isDark ? "#cfe1ff" : "#6b7a94",
    },

    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },

    counterPill: {
      padding: "8px 14px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 800,
      background: isDark ? "#173f6b" : "#edf4ff",
      color: isDark ? "#e6f1ff" : "#2a4b79",
      border: isDark ? "1px solid rgba(96,165,250,0.18)" : "1px solid #d7e6ff",
    },

    messagesArea: {
      flex: 1,
      minHeight: 520,
      maxHeight: 620,
      overflowY: "auto",
      padding: 20,
      background: isDark
        ? "linear-gradient(180deg, #102b4c 0%, #0e2746 100%)"
        : "linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%)",
    },

    loadingBox: {
      padding: 20,
      borderRadius: 18,
      background: isDark ? "#143861" : "#ffffff",
      color: isDark ? "#dcecff" : "#4f6079",
      border: isDark ? "1px solid rgba(96,165,250,0.16)" : "1px solid #dbe7ff",
    },

    emptyState: {
      minHeight: 220,
      display: "grid",
      placeItems: "center",
      textAlign: "center",
      borderRadius: 22,
      padding: 20,
      background: isDark ? "#143861" : "#ffffff",
      border: isDark ? "1px dashed rgba(96,165,250,0.24)" : "1px dashed #cbdcf8",
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#15304f",
      marginBottom: 6,
    },

    emptyText: {
      color: isDark ? "#cfe1ff" : "#70819d",
      lineHeight: 1.6,
    },

    messageRow: {
      display: "flex",
      marginBottom: 16,
    },

    messageWrap: {
      display: "flex",
      alignItems: "flex-end",
      gap: 10,
      maxWidth: "72%",
    },

    avatarMineSmall: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      background: "linear-gradient(135deg,#47c0ff,#5f9dff)",
      color: "#0d2c4b",
      flexShrink: 0,
    },

    avatarOtherSmall: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      background: "linear-gradient(135deg,#19c5a5,#47d17d)",
      color: "#ffffff",
      flexShrink: 0,
    },

    messageBubble: {
      padding: "14px 16px",
      borderRadius: 18,
      boxShadow: isDark
        ? "0 10px 24px rgba(2,12,30,0.22)"
        : "0 8px 22px rgba(20,20,40,0.06)",
      wordBreak: "break-word",
      maxWidth: "100%",
    },

    messageBubbleMine: {
      background: "linear-gradient(135deg,#47c0ff 0%,#5f9dff 100%)",
      color: "#0d2c4b",
      borderTopRightRadius: 8,
    },

    messageBubbleOther: {
      background: isDark ? "#173a63" : "#ffffff",
      color: isDark ? "#f7fbff" : "#17304c",
      border: isDark ? "1px solid rgba(96,165,250,0.16)" : "1px solid #dbe7ff",
      borderTopLeftRadius: 8,
    },

    senderTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },

    senderName: {
      fontWeight: 900,
      fontSize: 14,
    },

    senderTime: {
      fontSize: 11,
      opacity: 0.82,
    },

    senderRoleTag: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      opacity: 0.85,
    },

    messageText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 1.7,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },

    imageWrap: {
      marginTop: 10,
    },

    messageImage: {
      width: "100%",
      maxWidth: 260,
      maxHeight: 230,
      objectFit: "cover",
      borderRadius: 14,
      display: "block",
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(0,0,0,0.08)",
    },

    composerSection: {
      padding: 18,
      borderTop: isDark ? "1px solid rgba(80,160,255,0.18)" : "1px solid #dbe7ff",
      background: isDark ? "#15365f" : "#eef5ff",
    },

    composerTitle: {
      fontSize: 15,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#17304c",
      marginBottom: 10,
    },

    textarea: {
      width: "100%",
      minHeight: 110,
      resize: "vertical",
      borderRadius: 18,
      padding: 16,
      fontSize: 15,
      lineHeight: 1.65,
      border: isDark ? "1px solid #4e9dff" : "1px solid #8db6ff",
      background: isDark ? "#0f2f54" : "#ffffff",
      color: isDark ? "#f8fbff" : "#17304c",
      outline: "none",
      boxSizing: "border-box",
      boxShadow: isDark
        ? "inset 0 0 0 1px rgba(77,184,255,0.06)"
        : "0 4px 12px rgba(50,90,160,0.05)",
    },

    previewBox: {
      marginBottom: 12,
      padding: 12,
      borderRadius: 16,
      background: isDark ? "#103052" : "#ffffff",
      border: isDark ? "1px solid rgba(96,165,250,0.16)" : "1px solid #dbe7ff",
    },

    previewHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 10,
    },

    previewText: {
      fontSize: 13,
      fontWeight: 800,
      color: isDark ? "#dcecff" : "#47607f",
    },

    previewImage: {
      maxWidth: 250,
      width: "100%",
      maxHeight: 220,
      objectFit: "cover",
      borderRadius: 12,
      border: isDark ? "1px solid rgba(96,165,250,0.16)" : "1px solid #dbe7ff",
    },

    removeImageBtn: {
      padding: "8px 12px",
      borderRadius: 10,
      border: isDark ? "1px solid rgba(248,113,113,0.25)" : "1px solid #fecaca",
      background: isDark ? "#4b1f25" : "#fee2e2",
      color: isDark ? "#fecaca" : "#b91c1c",
      cursor: "pointer",
      fontWeight: 800,
    },

    bottomActions: {
      marginTop: 12,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
    },

    leftActions: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },

    rightActions: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },

    fileInput: {
      display: "none",
    },

    uploadBtn: {
      padding: "10px 14px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(96,165,250,0.18)" : "1px solid #7ea8ff",
      background: isDark ? "#163b63" : "#f4f8ff",
      color: isDark ? "#eff6ff" : "#254a79",
      fontWeight: 800,
      cursor: "pointer",
    },

    fileText: {
      fontSize: 13,
      color: isDark ? "#dcecff" : "#5b6d87",
      wordBreak: "break-all",
    },

    clearBtn: {
      padding: "10px 16px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(96,165,250,0.18)" : "1px solid #7ea8ff",
      background: isDark ? "#163b63" : "#f4f8ff",
      color: isDark ? "#eff6ff" : "#254a79",
      fontWeight: 800,
      cursor: "pointer",
    },

    sendBtn: {
      padding: "10px 18px",
      borderRadius: 14,
      border: "none",
      background: "linear-gradient(135deg,#47c0ff,#5f9dff)",
      color: "#0d2c4b",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 12px 22px rgba(77,184,255,0.24)",
    },

    helperText: {
      marginTop: 12,
      fontSize: 12,
      color: isDark ? "#d0e3ff" : "#61728c",
    },

    sidePanel: {
      display: "grid",
      gap: 18,
      position: "sticky",
      top: 24,
    },

    infoCard: {
      padding: 20,
      borderRadius: 26,
      border: isDark ? "1px solid rgba(80,160,255,0.16)" : "1px solid #dbe7ff",
      background: isDark
        ? "linear-gradient(180deg, #113256 0%, #0e2948 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
      boxShadow: isDark
        ? "0 16px 32px rgba(2,12,30,0.24)"
        : "0 14px 30px rgba(20,20,40,0.06)",
    },

    infoTitle: {
      fontSize: 20,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#15304f",
      marginBottom: 10,
    },

    infoDescription: {
      fontSize: 14,
      lineHeight: 1.65,
      color: isDark ? "#d8e7ff" : "#60728d",
      marginBottom: 14,
    },

    infoMuted: {
      fontSize: 14,
      lineHeight: 1.65,
      color: isDark ? "#9ebde8" : "#8091a9",
      marginBottom: 14,
    },

    infoGrid: {
      display: "grid",
      gap: 10,
    },

    infoChip: {
      display: "grid",
      gap: 5,
      padding: 12,
      borderRadius: 16,
      border: isDark ? "1px solid rgba(96,165,250,0.14)" : "1px solid #dbe7ff",
      background: isDark ? "#143861" : "#f5f9ff",
    },

    infoKey: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: 800,
      color: isDark ? "#9ec7ff" : "#5c83bc",
    },

    infoValue: {
      fontSize: 14,
      fontWeight: 800,
      color: isDark ? "#ffffff" : "#17304c",
    },

    statusBlock: {
      marginTop: 14,
      display: "grid",
      gap: 8,
    },

    statusPill: {
      width: "fit-content",
      padding: "8px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
    },

    actionCard: {
      padding: 20,
      borderRadius: 26,
      border: isDark ? "1px solid rgba(80,160,255,0.16)" : "1px solid #dbe7ff",
      background: isDark
        ? "linear-gradient(180deg, #113256 0%, #0e2948 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
      boxShadow: isDark
        ? "0 16px 32px rgba(2,12,30,0.24)"
        : "0 14px 30px rgba(20,20,40,0.06)",
      display: "grid",
      gap: 12,
    },

    actionTitle: {
      fontSize: 16,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#15304f",
      marginBottom: 2,
    },

    tipText: {
      fontSize: 14,
      lineHeight: 1.7,
      color: isDark ? "#d8e7ff" : "#60728d",
    },

    progressBtn: {
      padding: "12px 14px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(251,146,60,0.28)" : "1px solid #fed7aa",
      background: isDark ? "#5a3615" : "#ffedd5",
      color: isDark ? "#fdba74" : "#c2410c",
      fontWeight: 900,
      cursor: "pointer",
    },

    completeBtn: {
      padding: "12px 14px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(74,222,128,0.28)" : "1px solid #bbf7d0",
      background: isDark ? "#163927" : "#dcfce7",
      color: isDark ? "#bbf7d0" : "#166534",
      fontWeight: 900,
      cursor: "pointer",
    },

    rejectBtn: {
      padding: "12px 14px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(248,113,113,0.28)" : "1px solid #fecaca",
      background: isDark ? "#4b1f25" : "#fee2e2",
      color: isDark ? "#fecaca" : "#b91c1c",
      fontWeight: 900,
      cursor: "pointer",
    },

    disabledActionBtn: {
      opacity: 0.55,
      cursor: "not-allowed",
      filter: "grayscale(0.12)",
      boxShadow: "none",
    },
  };
}