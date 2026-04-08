import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import Toast from "../../components/Toast";

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

function getMsgText(m) {
  return m?.text || m?.message || m?.body || m?.content || "";
}

function getMsgImage(m) {
  return buildFullMediaUrl(
    m?.image_url ||
      m?.image ||
      m?.picture ||
      m?.photo ||
      m?.file ||
      m?.attachment ||
      m?.media ||
      m?.media_url ||
      ""
  );
}

function getSenderName(m) {
  return m?.sender_username || m?.sender_name || m?.sender_email || "User";
}

function isOwnerMessage(m) {
  const role = String(m?.sender_role || "").toLowerCase();
  const sender = String(getSenderName(m)).toLowerCase();

  if (role === "owner") return true;
  if (role === "provider" || role === "service_provider") return false;

  if (sender.includes("owner")) return true;
  if (sender.includes("provider") || sender.includes("service")) return false;

  return false;
}

function normalizeMessages(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  return [];
}

function safeArr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getRequestProviderName(req) {
  return (
    req?.assigned_provider_name ||
    req?.provider_name ||
    req?.provider?.username ||
    req?.provider?.name ||
    req?.provider?.user?.username ||
    "Service Provider"
  );
}

function getRequestLabel(req) {
  if (!req) return "Request";
  return req?.title || `Service chat #${req?.id}`;
}

function getRequestSnippet(req) {
  if (!req) return "No conversation yet.";
  return (
    String(req?.last_message || req?.latest_message || req?.description || "").slice(0, 85) ||
    "No conversation yet."
  );
}

function getRequestStatus(req) {
  if (!req) return "Unknown";
  return String(req?.status || req?.state || "").replace(/_/g, " ") || "Open";
}

function formatMessageTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).replace("T", " ").slice(0, 19);
    return d.toLocaleString();
  } catch {
    return String(value).replace("T", " ").slice(0, 19);
  }
}

function getThemeStyles(isDark) {
  return {
    page: {
      maxWidth: 1440,
      margin: "0 auto",
      padding: 20,
      minHeight: "100%",
      color: isDark ? "#f8fbff" : "#111827",
    },

    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 20,
    },

    heroCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
      background: isDark
        ? "linear-gradient(135deg, rgba(10,25,56,0.96), rgba(16,43,87,0.95))"
        : "#ffffff",
      border: isDark ? "1px solid rgba(148, 163, 184, 0.18)" : "1px solid #e5e7eb",
      borderRadius: 26,
      padding: 24,
      boxShadow: isDark
        ? "0 20px 50px rgba(0, 0, 0, 0.28)"
        : "0 16px 40px rgba(24, 24, 40, 0.08)",
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: "0.12em",
      color: isDark ? "#93c5fd" : "#64748b",
      marginBottom: 8,
    },

    heroTitle: {
      margin: 0,
      fontSize: 24,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#141422",
    },

    heroSub: {
      margin: "8px 0 0 0",
      color: isDark ? "rgba(226,232,240,0.82)" : "#66667d",
      fontSize: 15,
    },

    heroActions: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
    },

    ghostBtn: {
      padding: "12px 16px",
      borderRadius: 14,
      border: isDark ? "1px solid rgba(148,163,184,0.22)" : "1px solid #e4e4ef",
      background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
      color: isDark ? "#f8fbff" : "#2d2d3f",
      fontWeight: 800,
      cursor: "pointer",
      boxShadow: isDark
        ? "0 8px 20px rgba(0,0,0,0.18)"
        : "0 4px 16px rgba(18,18,30,0.04)",
    },

    summaryRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 14,
    },

    summaryCard: {
      background: isDark
        ? "linear-gradient(135deg, rgba(8,22,48,0.95), rgba(14,35,72,0.94))"
        : "#ffffff",
      border: isDark ? "1px solid rgba(148,163,184,0.18)" : "1px solid #ececf3",
      borderRadius: 20,
      padding: 18,
      boxShadow: isDark
        ? "0 14px 32px rgba(0,0,0,0.22)"
        : "0 10px 28px rgba(24,24,40,0.05)",
    },

    summaryLabel: {
      fontSize: 12,
      fontWeight: 700,
      color: isDark ? "#93c5fd" : "#8a8aa0",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },

    summaryValue: {
      fontSize: 20,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#171727",
    },

    summaryBadge: {
      display: "inline-block",
      padding: "8px 14px",
      borderRadius: 999,
      background: isDark
        ? "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(96,165,250,0.22))"
        : "linear-gradient(135deg, #ddd6fe, #c4b5fd)",
      color: isDark ? "#bfdbfe" : "#5b21b6",
      fontSize: 13,
      fontWeight: 800,
    },

    chatCard: {
      background: isDark
        ? "linear-gradient(180deg, rgba(7,18,40,0.98), rgba(10,27,58,0.97))"
        : "#ffffff",
      border: isDark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #ececf3",
      borderRadius: 26,
      overflow: "hidden",
      boxShadow: isDark
        ? "0 22px 54px rgba(0,0,0,0.30)"
        : "0 18px 45px rgba(24, 24, 40, 0.08)",
    },

    chatHeader: {
      padding: "22px 22px 16px",
      borderBottom: isDark
        ? "1px solid rgba(148,163,184,0.14)"
        : "1px solid #f0f0f5",
      background: isDark
        ? "linear-gradient(180deg, rgba(9,23,50,1) 0%, rgba(13,31,66,1) 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #fafaff 100%)",
    },

    chatTitle: {
      margin: 0,
      fontSize: 22,
      fontWeight: 900,
      color: isDark ? "#ffffff" : "#171727",
    },

    chatSub: {
      margin: "6px 0 0 0",
      color: isDark ? "rgba(226,232,240,0.78)" : "#76768a",
      fontSize: 14,
    },

    chatLayout: {
      display: "flex",
      flexDirection: "column",
      height: 880,
      minHeight: 680,
    },

    chatArea: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding: 20,
      background: isDark
        ? "linear-gradient(180deg, #071a3b 0%, #0a224d 100%)"
        : "linear-gradient(180deg, #f9f9fd 0%, #f6f6fb 100%)",
    },

    contentLayout: {
      display: "grid",
      gridTemplateColumns: "320px minmax(0, 1fr)",
      gap: 18,
      alignItems: "stretch",
    },

    sidebar: {
      display: "flex",
      flexDirection: "column",
      minWidth: 320,
      maxHeight: 760,
      background: isDark ? "rgba(6, 15, 42, 0.96)" : "#ffffff",
      border: isDark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #ececf3",
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: isDark
        ? "0 22px 54px rgba(0,0,0,0.23)"
        : "0 18px 45px rgba(24,24,40,0.08)",
    },

    sidebarHeader: {
      padding: 20,
      borderBottom: isDark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #f0f0f5",
      background: isDark
        ? "linear-gradient(180deg, rgba(9,23,50,1) 0%, rgba(13,31,66,1) 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #fafaff 100%)",
    },

    sidebarTitle: {
      margin: 0,
      fontSize: 18,
      fontWeight: 900,
      color: isDark ? "#f8fbff" : "#111827",
    },

    sidebarText: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 1.6,
      color: isDark ? "#cbd5e1" : "#5b5f72",
    },

    sidebarList: {
      overflowY: "auto",
      minHeight: 0,
    },

    sidebarItem: {
      display: "block",
      width: "100%",
      padding: "18px 20px",
      textAlign: "left",
      cursor: "pointer",
      borderBottom: isDark ? "1px solid rgba(148,163,184,0.08)" : "1px solid #f0f0f5",
      background: "transparent",
      transition: "background 0.2s ease, transform 0.2s ease",
    },

    activeSidebarItem: {
      background: isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(59, 130, 246, 0.12)",
      transform: "scale(1.01)",
    },

    requestTitle: {
      margin: 0,
      fontSize: 15,
      fontWeight: 800,
      color: isDark ? "#ffffff" : "#111827",
    },

    requestMeta: {
      marginTop: 8,
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#6b7280",
    },

    requestSnippet: {
      marginTop: 10,
      fontSize: 13,
      color: isDark ? "#e2e8f0" : "#4b5563",
      lineHeight: 1.5,
    },

    requestStatus: {
      display: "inline-flex",
      marginTop: 10,
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      background: isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.12)",
      color: isDark ? "#cbd5e1" : "#475569",
    },

    emptySidebar: {
      padding: 24,
      color: isDark ? "#cbd5e1" : "#64748b",
      fontSize: 14,
    },

    emptyState: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: isDark ? "#cbd5e1" : "#808094",
      fontSize: 15,
      fontWeight: 600,
    },

    messageRow: {
      display: "flex",
      marginBottom: 16,
      width: "100%",
    },

    messageWrap: {
      display: "flex",
      flexDirection: "column",
      maxWidth: "58%",
    },

    metaRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      flexWrap: "wrap",
    },

    senderName: {
      fontSize: 13,
      fontWeight: 900,
      color: isDark ? "#f8fbff" : "#202033",
    },

    senderRole: {
      fontSize: 11,
      fontWeight: 800,
      color: isDark ? "#93c5fd" : "#8b8ba3",
      letterSpacing: "0.08em",
    },

    messageBubble: {
      padding: 14,
      borderRadius: 22,
      boxShadow: isDark
        ? "0 10px 26px rgba(0, 0, 0, 0.25)"
        : "0 10px 26px rgba(20, 20, 40, 0.08)",
      maxWidth: "100%",
      boxSizing: "border-box",
    },

    ownerBubble: {
      background: isDark
        ? "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)"
        : "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
      color: "#ffffff",
      textShadow: "0 1px 2px rgba(0,0,0,0.2)",
      borderTopRightRadius: 8,
      border: "none",
      boxShadow: isDark
        ? "0 8px 25px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
        : "0 8px 25px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
    },

    providerBubble: {
      background: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
      color: isDark ? "#eaf2ff" : "#191927",
      border: isDark
        ? "1px solid rgba(148,163,184,0.18)"
        : "1px solid #ececf2",
      borderTopLeftRadius: 8,
    },

    messageText: {
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: 1.6,
      fontSize: 15,
    },

    messageTime: {
      marginTop: 10,
      fontSize: 11,
      fontWeight: 700,
      opacity: 0.9,
    },

    messageImage: {
      width: "100%",
      maxWidth: 240,
      maxHeight: 240,
      objectFit: "cover",
      borderRadius: 16,
      display: "block",
      marginBottom: 10,
      border: isDark
        ? "1px solid rgba(148,163,184,0.16)"
        : "1px solid rgba(0,0,0,0.08)",
    },

    composer: {
      padding: 20,
      borderTop: isDark
        ? "1px solid rgba(148,163,184,0.14)"
        : "1px solid #f0f0f5",
      background: isDark
        ? "linear-gradient(180deg, rgba(8,22,48,1), rgba(10,27,58,1))"
        : "#ffffff",
    },

    previewCard: {
      marginBottom: 14,
      background: isDark ? "rgba(255,255,255,0.05)" : "#fafaff",
      border: isDark
        ? "1px solid rgba(148,163,184,0.16)"
        : "1px solid #ececf2",
      borderRadius: 18,
      padding: 14,
    },

    previewTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
      flexWrap: "wrap",
    },

    previewLabel: {
      fontSize: 13,
      fontWeight: 800,
      color: isDark ? "#dbeafe" : "#55556e",
    },

    previewImage: {
      width: "100%",
      maxWidth: 220,
      maxHeight: 220,
      objectFit: "cover",
      borderRadius: 14,
      border: isDark
        ? "1px solid rgba(148,163,184,0.16)"
        : "1px solid #e6e6ef",
      display: "block",
    },

    removeBtn: {
      padding: "8px 12px",
      borderRadius: 12,
      border: isDark ? "1px solid rgba(248,113,113,0.35)" : "1px solid #fecaca",
      background: isDark ? "rgba(127,29,29,0.25)" : "#fee2e2",
      color: isDark ? "#fecaca" : "#b91c1c",
      fontWeight: 800,
      cursor: "pointer",
    },

    textarea: {
      width: "100%",
      minHeight: 120,
      resize: "vertical",
      borderRadius: 18,
      border: isDark
        ? "1px solid rgba(148,163,184,0.18)"
        : "1px solid #ddddea",
      background: isDark ? "rgba(255,255,255,0.06)" : "#fcfcff",
      padding: 16,
      fontSize: 15,
      lineHeight: 1.6,
      color: isDark ? "#f8fbff" : "#1e1e2e",
      outline: "none",
      boxSizing: "border-box",
    },

    composerFooter: {
      marginTop: 14,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
    },

    leftActions: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },

    uploadBtn: {
      padding: "12px 16px",
      borderRadius: 14,
      border: isDark
        ? "1px solid rgba(148,163,184,0.18)"
        : "1px solid #ddddef",
      background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
      color: isDark ? "#f8fbff" : "#33334d",
      fontWeight: 800,
      cursor: "pointer",
    },

    fileName: {
      fontSize: 13,
      color: isDark ? "#cbd5e1" : "#6b7280",
      wordBreak: "break-all",
    },

    sendBtn: {
      padding: "14px 22px",
      borderRadius: 16,
      border: "none",
      background: isDark
        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
        : "linear-gradient(135deg, #6d28d9, #8b5cf6)",
      color: "#ffffff",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: isDark
        ? "0 12px 28px rgba(37, 99, 235, 0.28)"
        : "0 12px 28px rgba(124, 58, 237, 0.25)",
    },

    sendBtnDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
    },

    helperText: {
      marginTop: 10,
      fontSize: 12,
      color: isDark ? "#cbd5e1" : "#7a7a8e",
    },
  };
}

export default function OwnerProviderChat() {
  const { jobId } = useParams();
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(() => getThemeStyles(isDark), [isDark]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const messageCount = useMemo(() => messages.length, [messages]);

  const selectedRequest = useMemo(() => {
    return requests.find((r) => String(r?.id) === String(jobId)) || requests[0] || null;
  }, [requests, jobId]);

  const activeJobId = jobId || selectedRequest?.id || "";

  const showToast = (type, msg) => setToast({ type, msg });

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await api.get("owner/maintenance/");
      setRequests(safeArr(res.data));
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          "Failed to load provider conversations"
      );
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!requestsLoading && requests.length && !jobId) {
      nav(`/owner/provider-chat/${requests[0]?.id}`, { replace: true });
    }
  }, [requestsLoading, requests, jobId, nav]);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }, 50);
  };

  const loadMessages = async (showLoader = true) => {
    const currentJobId = jobId || selectedRequest?.id;

    if (!currentJobId) {
      setMessages([]);
      if (showLoader) setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const res = await api.get(`owner/maintenance/${currentJobId}/messages/`);
      setMessages(normalizeMessages(res.data));
      if (toast.msg) showToast("info", "");
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          "Failed to load messages"
      );
      setMessages([]);
    } finally {
      if (showLoader) setLoading(false);
      scrollToBottom(false);
    }
  };

  useEffect(() => {
    loadMessages(true);
  }, [jobId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select a valid image file");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    const cleanText = text.trim();

    if (!cleanText && !selectedImage) {
      showToast("error", "Write a message or choose an image");
      return;
    }

    if (!activeJobId) {
      showToast("error", "No active maintenance chat selected");
      return;
    }

    try {
      setSending(true);

      const formData = new FormData();
      formData.append("text", cleanText);
      formData.append("message", cleanText);
      if (selectedImage) formData.append("image", selectedImage);

      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        text: cleanText,
        message: cleanText,
        image_url: previewUrl || "",
        image: previewUrl || "",
        sender_role: "owner",
        sender_name: "Owner",
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      setText("");
      clearSelectedImage();
      scrollToBottom(true);

      const res = await api.post(
        `owner/maintenance/${activeJobId}/messages/send/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const newMessage = res?.data;

      if (newMessage && typeof newMessage === "object") {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? newMessage : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        await loadMessages(false);
      }

      showToast("success", "Message sent successfully");
      textareaRef.current?.focus();
      scrollToBottom(true);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => !m._optimistic));
      showToast(
        "error",
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) sendMessage();
    }
  };

  return (
    <Shell>
      <div style={styles.page}>
        <Toast
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div style={styles.wrapper}>
          <div style={styles.heroCard}>
            <div>
              <div style={styles.eyebrow}>OWNER COMMUNICATION</div>
              <h1 style={styles.heroTitle}>Owner Provider Chat • Job #{activeJobId || "-"}</h1>
              <p style={styles.heroSub}>
                Talk directly with the service provider about this maintenance request.
              </p>
            </div>

            <div style={styles.heroActions}>
              <button
                type="button"
                onClick={() => nav("/owner")}
                style={styles.ghostBtn}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => loadMessages(true)}
                style={styles.ghostBtn}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Job</div>
              <div style={styles.summaryValue}>#{activeJobId || "-"}</div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Provider</div>
              <div style={styles.summaryValue}>
                {getRequestProviderName(selectedRequest)}
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Conversation</div>
              <div style={styles.summaryValue}>{messageCount} messages</div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Chat Type</div>
              <div style={styles.summaryBadge}>Maintenance</div>
            </div>
          </div>

          <div style={styles.contentLayout}>
            <div style={styles.sidebar}>
              <div style={styles.sidebarHeader}>
                <h2 style={styles.sidebarTitle}>Provider Conversations</h2>
                <p style={styles.sidebarText}>
                  Select a service provider chat to view the full conversation.
                </p>
              </div>

              <div style={styles.sidebarList}>
                {requestsLoading ? (
                  <div style={styles.emptySidebar}>Loading conversations...</div>
                ) : requests.length === 0 ? (
                  <div style={styles.emptySidebar}>
                    No provider conversations available yet.
                  </div>
                ) : (
                  requests.map((req) => {
                    const active = String(req?.id) === String(activeJobId);

                    return (
                      <button
                        key={req?.id}
                        type="button"
                        style={{
                          ...styles.sidebarItem,
                          ...(active ? styles.activeSidebarItem : {}),
                        }}
                        onClick={() => nav(`/owner/provider-chat/${req?.id}`)}
                      >
                        <h3 style={styles.requestTitle}>{getRequestLabel(req)}</h3>

                        <div style={styles.requestMeta}>
                          {getRequestProviderName(req)} · {getRequestStatus(req)}
                        </div>

                        <div style={styles.requestSnippet}>{getRequestSnippet(req)}</div>

                        <div style={styles.requestStatus}>{getRequestStatus(req)}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={styles.chatCard}>
              <div style={styles.chatHeader}>
                <div>
                  <h2 style={styles.chatTitle}>Conversation</h2>
                  <p style={styles.chatSub}>
                    Owner messages appear on the right, provider messages on the left.
                  </p>
                </div>
              </div>

              <div style={styles.chatLayout}>
                <div style={styles.chatArea}>
                  {loading ? (
                    <div style={styles.emptyState}>Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div style={styles.emptyState}>No messages yet.</div>
                  ) : (
                    messages.map((m, i) => {
                      const ownerSide = isOwnerMessage(m);
                      const msgText = getMsgText(m);
                      const msgImage = getMsgImage(m);

                      return (
                        <div
                          key={m?.id || i}
                          style={{
                            ...styles.messageRow,
                            justifyContent: ownerSide ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              ...styles.messageWrap,
                              alignItems: ownerSide ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                ...styles.metaRow,
                                justifyContent: ownerSide ? "flex-end" : "flex-start",
                              }}
                            >
                              <span style={styles.senderName}>{getSenderName(m)}</span>
                              <span style={styles.senderRole}>
                                {String(
                                  m?.sender_role || (ownerSide ? "OWNER" : "PROVIDER")
                                ).toUpperCase()}
                              </span>
                            </div>

                            <div
                              style={{
                                ...styles.messageBubble,
                                ...(ownerSide ? styles.ownerBubble : styles.providerBubble),
                              }}
                            >
                              {msgImage ? (
                                <img
                                  src={msgImage}
                                  alt="chat attachment"
                                  style={styles.messageImage}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null}

                              {msgText ? (
                                <div style={styles.messageText}>{msgText}</div>
                              ) : null}

                              <div style={styles.messageTime}>
                                {formatMessageTime(
                                  m?.created_at || m?.timestamp || m?.sent_at
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={bottomRef} />
                </div>

                <div style={styles.composer}>
                  {previewUrl ? (
                    <div style={styles.previewCard}>
                      <div style={styles.previewTop}>
                        <div style={styles.previewLabel}>Selected Image</div>
                        <button
                          type="button"
                          onClick={clearSelectedImage}
                          disabled={sending}
                          style={styles.removeBtn}
                        >
                          Remove
                        </button>
                      </div>

                      <img src={previewUrl} alt="preview" style={styles.previewImage} />
                    </div>
                  ) : null}

                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your message to the service provider..."
                    style={styles.textarea}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />

                  <div style={styles.composerFooter}>
                    <div style={styles.leftActions}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleImageChange}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending}
                        style={styles.uploadBtn}
                      >
                        Upload Image
                      </button>

                      <div style={styles.fileName}>
                        {selectedImage ? selectedImage.name : "No image selected"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={sending}
                      style={{
                        ...styles.sendBtn,
                        ...(sending ? styles.sendBtnDisabled : {}),
                      }}
                    >
                      {sending ? "Sending..." : "Send Message"}
                    </button>
                  </div>

                  <div style={styles.helperText}>
                    Press <strong>Enter</strong> to send and <strong>Shift + Enter</strong> for a
                    new line.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}