// src/pages/owner/OwnerMaintenance.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";
import {
  ArrowLeft,
  RefreshCw,
  Send,
  ImagePlus,
  X,
  Wrench,
  MessageSquare,
  UserCircle2,
  CheckCircle2,
} from "lucide-react";

function safeArr(d) {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.results)) return d.results;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function axiosMsg(err, fallback) {
  const data = err?.response?.data;
  return data?.detail || data?.message || data?.error || err?.message || fallback;
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

function getProviderId(p) {
  return p?.id ?? p?.pk ?? null;
}

function getProviderName(p) {
  return p?.username ?? p?.user?.username ?? "Service Provider";
}
function getProviderEmail(p) {
  return p?.email ?? p?.user?.email ?? "";
}
function getProviderPhone(p) {
  return p?.phone ?? "";
}
function getProviderCategory(p) {
  return p?.category ?? "other";
}
function getProviderArea(p) {
  return p?.service_area ?? "";
}

function getMsgText(m) {
  return m?.text || m?.message || m?.body || m?.content || "";
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

function statusClasses(status, isDark) {
  const s = String(status || "").toLowerCase();

  if (s === "open") {
    return isDark
      ? "bg-amber-500/15 text-amber-300 border border-amber-400/20"
      : "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (s === "in_progress") {
    return isDark
      ? "bg-sky-500/15 text-sky-300 border border-sky-400/20"
      : "bg-sky-50 text-sky-700 border border-sky-200";
  }
  if (s === "resolved" || s === "completed") {
    return isDark
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (s === "cancelled") {
    return isDark
      ? "bg-rose-500/15 text-rose-300 border border-rose-400/20"
      : "bg-rose-50 text-rose-700 border border-rose-200";
  }

  return isDark
    ? "bg-white/10 text-slate-200 border border-white/10"
    : "bg-slate-100 text-slate-700 border border-slate-200";
}

function priorityClasses(priority, isDark) {
  const p = String(priority || "").toLowerCase();

  if (p === "emergency") return isDark ? "text-rose-300" : "text-rose-700";
  if (p === "high") return isDark ? "text-orange-300" : "text-orange-700";
  if (p === "medium") return isDark ? "text-yellow-300" : "text-yellow-700";
  return isDark ? "text-emerald-300" : "text-emerald-700";
}

export default function OwnerMaintenance() {
  const { role } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [form, setForm] = useState({
    title: "",
    category: "plumbing",
    priority: "medium",
    listing_id: "",
    description: "",
  });

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requests, setRequests] = useState([]);

  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");
  const [providers, setProviders] = useState([]);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterArea, setFilterArea] = useState("");

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeReq, setActiveReq] = useState(null);

  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const canChat = !!(
    activeReq?.assigned_provider_id ||
    activeReq?.assigned_provider ||
    activeReq?.provider_id ||
    activeReq?.provider ||
    activeReq?.assigned_provider_name
  );

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return nav("/auth", { replace: true });
    if (role !== "owner") return nav("/unauthorized", { replace: true });
  }, [role, nav]);

  useEffect(() => {
    setSelectedProvider(null);
    setChatText("");
    clearSelectedImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReq?.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatLoading]);

  const loadProviders = async () => {
    setProvidersLoading(true);
    setProvidersError("");
    try {
      const res = await api.get("owner/providers/");
      setProviders(safeArr(res.data));
    } catch (e) {
      setProvidersError(axiosMsg(e, "Failed to load providers."));
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  const loadRequests = async (keepActiveId = null) => {
    setRequestsLoading(true);
    try {
      const res = await api.get("owner/maintenance/");
      const list = safeArr(res.data);
      setRequests(list);

      if (keepActiveId) {
        const found = list.find((x) => String(x?.id) === String(keepActiveId));
        setActiveReq(found || list[0] || null);
      } else {
        setActiveReq((prev) => {
          if (prev?.id) {
            const found = list.find((x) => String(x?.id) === String(prev.id));
            if (found) return found;
          }
          return list[0] || null;
        });
      }
    } catch (e) {
      setToast({ type: "error", msg: axiosMsg(e, "Failed to load requests.") });
      setRequests([]);
      setActiveReq(null);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadChat = async (reqId) => {
    if (!reqId) return;
    setChatLoading(true);
    try {
      const res = await api.get(`owner/maintenance/${reqId}/messages/`);
      setMessages(safeArr(res.data));
    } catch (e) {
      setMessages([]);
      setToast({ type: "error", msg: axiosMsg(e, "Failed to load chat.") });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
    loadRequests();
  }, []);

  useEffect(() => {
    if (activeReq?.id) loadChat(activeReq.id);
  }, [activeReq?.id]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", msg: "Please choose a valid image file." });
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

  const submitRequest = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setToast({ type: "error", msg: "Title is required." });
      return;
    }
    if (!form.description.trim()) {
      setToast({ type: "error", msg: "Description is required." });
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        listing_id: form.listing_id ? Number(form.listing_id) : null,
      };

      const res = await api.post("owner/maintenance/create/", payload);

      setToast({
        type: "success",
        msg: "Maintenance request created successfully.",
      });

      setForm({
        title: "",
        category: "plumbing",
        priority: "medium",
        listing_id: "",
        description: "",
      });

      const newId = res?.data?.id;
      await loadRequests(newId);
    } catch (e2) {
      setToast({ type: "error", msg: axiosMsg(e2, "Failed to create request.") });
    }
  };

  const assignProvider = async () => {
    if (!activeReq?.id) {
      setToast({ type: "error", msg: "Select a request first." });
      return;
    }

    if (!selectedProvider) {
      setToast({ type: "error", msg: "Please select a provider." });
      return;
    }

    if (activeReq?.assigned_provider_id || activeReq?.assigned_provider_name) {
      setToast({ type: "info", msg: "A provider is already assigned to this request." });
      return;
    }

    const provider_profile_id = getProviderId(selectedProvider);
    if (!provider_profile_id) {
      setToast({ type: "error", msg: "Selected provider is invalid." });
      return;
    }

    try {
      await api.post(`owner/maintenance/${activeReq.id}/assign-provider/`, {
        provider_profile_id,
      });

      setToast({
        type: "success",
        msg: "Provider assigned successfully. Chat is now enabled.",
      });

      await loadRequests(activeReq.id);
      await loadChat(activeReq.id);
    } catch (e) {
      try {
        await api.patch(`owner/maintenance/${activeReq.id}/assign/`, {
          provider_profile_id,
        });

        setToast({
          type: "success",
          msg: "Provider assigned successfully. Chat is now enabled.",
        });

        await loadRequests(activeReq.id);
        await loadChat(activeReq.id);
      } catch (e2) {
        setToast({ type: "error", msg: axiosMsg(e2, "Failed to assign provider.") });
      }
    }
  };

  const sendChat = async () => {
    if (!activeReq?.id) {
      setToast({ type: "error", msg: "Select a request first." });
      return;
    }

    if (!canChat) {
      setToast({ type: "error", msg: "Assign a provider first." });
      return;
    }

    if (!chatText.trim() && !selectedImage) {
      setToast({ type: "error", msg: "Write a message or choose an image first." });
      return;
    }

    setSendingChat(true);
    try {
      const formData = new FormData();
      formData.append("text", chatText.trim());
      formData.append("message", chatText.trim());
      if (selectedImage) formData.append("image", selectedImage);

      await api.post(`owner/maintenance/${activeReq.id}/messages/send/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setChatText("");
      clearSelectedImage();
      await loadChat(activeReq.id);
      await loadRequests(activeReq.id);

      setToast({ type: "success", msg: "Message sent successfully." });

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (e) {
      setToast({ type: "error", msg: axiosMsg(e, "Failed to send message.") });
    } finally {
      setSendingChat(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendingChat && canChat && (chatText.trim() || selectedImage)) {
        sendChat();
      }
    }
  };

  const categories = useMemo(() => {
    const set = new Set();
    (providers || []).forEach((p) =>
      set.add(String(getProviderCategory(p) || "other").toLowerCase())
    );
    return ["", ...Array.from(set).filter(Boolean).sort()];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const c = String(filterCategory || "").trim().toLowerCase();
    const a = String(filterArea || "").trim().toLowerCase();

    return (providers || []).filter((p) => {
      const pc = String(getProviderCategory(p) || "").toLowerCase();
      const pa = String(getProviderArea(p) || "").toLowerCase();
      return (!c || pc === c) && (!a || pa.includes(a));
    });
  }, [providers, filterCategory, filterArea]);

  const stats = useMemo(() => {
    const total = requests.length;
    const open = requests.filter((r) => String(r?.status).toLowerCase() === "open").length;
    const progress = requests.filter((r) => String(r?.status).toLowerCase() === "in_progress").length;
    const assigned = requests.filter(
      (r) =>
        !!(
          r?.assigned_provider_id ||
          r?.assigned_provider ||
          r?.provider_id ||
          r?.assigned_provider_name
        )
    ).length;
    return { total, open, progress, assigned };
  }, [requests]);

  const ui = {
    pageWrap: isDark
      ? "overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0b2341] via-[#102f57] to-[#173d70] shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
      : "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]",

    topBar: isDark
      ? "border-b border-white/10 bg-white/[0.03] px-6 py-5"
      : "border-b border-slate-200 bg-slate-50 px-6 py-5",

    heading: isDark ? "text-3xl font-black tracking-tight text-white" : "text-3xl font-black tracking-tight text-slate-900",
    subheading: isDark ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-600",

    ghostBtn: isDark
      ? "inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
      : "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50",

    statCard: isDark
      ? "rounded-2xl border border-white/10 bg-white/5 p-4"
      : "rounded-2xl border border-slate-200 bg-white p-4",

    statLabel: isDark
      ? "text-xs uppercase tracking-wide text-slate-400"
      : "text-xs uppercase tracking-wide text-slate-500",

    sectionCard: isDark
      ? "rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
      : "rounded-3xl border border-slate-200 bg-white p-5",

    sectionTitle: isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900",
    sectionText: isDark ? "text-sm text-slate-400" : "text-sm text-slate-600",

    softBox: isDark
      ? "rounded-2xl border border-white/10 bg-slate-950/40 p-4"
      : "rounded-2xl border border-slate-200 bg-slate-50 p-4",

    input:
      isDark
        ? "w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/50"
        : "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500",

    textarea:
      isDark
        ? "w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/50"
        : "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500",

    selectedRequest: isDark
      ? "border-blue-400/40 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 shadow-[0_10px_35px_rgba(37,99,235,0.18)]"
      : "border-blue-300 bg-blue-50 shadow-[0_10px_25px_rgba(59,130,246,0.12)]",

    normalRequest: isDark
      ? "border-white/10 bg-slate-950/40 hover:bg-white/[0.06]"
      : "border-slate-200 bg-white hover:bg-slate-50",

    selectedProvider: isDark
      ? "border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 shadow-[0_10px_35px_rgba(16,185,129,0.18)]"
      : "border-emerald-300 bg-emerald-50 shadow-[0_10px_25px_rgba(16,185,129,0.10)]",

    normalProvider: isDark
      ? "border-white/10 bg-slate-950/40 hover:bg-white/[0.06]"
      : "border-slate-200 bg-white hover:bg-slate-50",

    smallBadge: isDark
      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300"
      : "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] text-slate-700",

    requestDesc: isDark ? "mt-3 line-clamp-2 text-sm text-slate-300" : "mt-3 line-clamp-2 text-sm text-slate-600",

    chatWrap: isDark
      ? "overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/55"
      : "overflow-hidden rounded-[26px] border border-slate-200 bg-white",

    chatHead: isDark
      ? "flex items-center justify-between border-b border-white/10 px-4 py-3"
      : "flex items-center justify-between border-b border-slate-200 px-4 py-3",

    chatReload: isDark
      ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10"
      : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100",

    chatBody: isDark ? "h-[430px] overflow-y-auto px-4 py-4" : "h-[430px] overflow-y-auto px-4 py-4 bg-slate-50/40",

    emptyChatBox: isDark
      ? "flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 text-center"
      : "flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center",

    chatFooter: isDark
      ? "border-t border-white/10 bg-slate-950/70 p-4"
      : "border-t border-slate-200 bg-slate-50 p-4",

    previewBox: isDark
      ? "mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
      : "mb-4 rounded-2xl border border-slate-200 bg-white p-3",

    editorBox: isDark
      ? "rounded-[24px] border border-white/10 bg-white/[0.03] p-3"
      : "rounded-[24px] border border-slate-200 bg-white p-3",

    chatTextarea: isDark
      ? "min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      : "min-h-[120px] w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60",

    imageBtn: isDark
      ? "inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",

    sendBtn:
      "inline-flex min-w-[190px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60",

    footer: isDark
      ? "border-t border-white/10 px-6 py-4 text-center text-xs text-slate-400"
      : "border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500",
  };

  return (
    <Shell
      title="Owner Maintenance"
      subtitle="Create requests, assign providers, and manage maintenance conversations."
      right={null}
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <div className="space-y-6">
        <div className={ui.pageWrap}>
          <div className={ui.topBar}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className={ui.heading}>Maintenance Control Panel</h1>
                <p className={ui.subheading}>
                  Keep your maintenance requests, provider assignment, and communication in one clean workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadProviders();
                    loadRequests(activeReq?.id || null);
                  }}
                  className={ui.ghostBtn}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => nav("/owner")}
                  className={ui.ghostBtn}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className={ui.statCard}>
                <div className={ui.statLabel}>Total Requests</div>
                <div className={`mt-2 text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {stats.total}
                </div>
              </div>

              <div className={ui.statCard}>
                <div className={ui.statLabel}>Open</div>
                <div className={`mt-2 text-2xl font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  {stats.open}
                </div>
              </div>

              <div className={ui.statCard}>
                <div className={ui.statLabel}>In Progress</div>
                <div className={`mt-2 text-2xl font-bold ${isDark ? "text-sky-300" : "text-sky-700"}`}>
                  {stats.progress}
                </div>
              </div>

              <div className={ui.statCard}>
                <div className={ui.statLabel}>Assigned</div>
                <div className={`mt-2 text-2xl font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                  {stats.assigned}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[1.08fr_0.92fr_1.25fr]">
            <div className="space-y-6">
              <section className={ui.sectionCard}>
                <div className="mb-4">
                  <h2 className={ui.sectionTitle}>Create New Request</h2>
                  <p className={ui.sectionText}>
                    Report the issue clearly so the right provider can handle it faster.
                  </p>
                </div>

                <form onSubmit={submitRequest} className="space-y-4">
                  <div>
                    <label className={`mb-1.5 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Title
                    </label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={onChange}
                      placeholder="e.g. Kitchen sink leaking"
                      className={ui.input}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Category
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={onChange}
                        className={ui.input}
                      >
                        <option value="plumbing">Plumbing</option>
                        <option value="electrical">Electrical</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="internet">Internet / WiFi</option>
                        <option value="gas">Gas</option>
                        <option value="hvac">AC / Heating</option>
                        <option value="pest_control">Pest Control</option>
                        <option value="carpentry">Carpentry</option>
                        <option value="painting">Painting</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className={`mb-1.5 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={form.priority}
                        onChange={onChange}
                        className={ui.input}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`mb-1.5 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Listing ID (optional)
                    </label>
                    <input
                      name="listing_id"
                      value={form.listing_id}
                      onChange={onChange}
                      placeholder="e.g. 12"
                      className={ui.input}
                    />
                  </div>

                  <div>
                    <label className={`mb-1.5 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={onChange}
                      rows={5}
                      placeholder="Describe the issue clearly..."
                      className={ui.textarea}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01]"
                  >
                    Create Request
                  </button>
                </form>
              </section>

              <section className={ui.sectionCard}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className={ui.sectionTitle}>My Requests</h2>
                    <p className={ui.sectionText}>
                      Select a request to assign provider and open its chat.
                    </p>
                  </div>
                  <div className={ui.smallBadge}>{requests.length} total</div>
                </div>

                {requestsLoading ? (
                  <div className={`${ui.softBox} text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Loading requests...
                  </div>
                ) : requests.length === 0 ? (
                  <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${
                      isDark
                        ? "border-white/10 bg-black/20 text-slate-400"
                        : "border-slate-300 bg-slate-50 text-slate-500"
                    }`}
                  >
                    No maintenance requests yet.
                  </div>
                ) : (
                  <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1">
                    {requests.map((r) => {
                      const active = String(activeReq?.id) === String(r?.id);

                      return (
                        <button
                          key={r?.id}
                          type="button"
                          onClick={() => setActiveReq(r)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active ? ui.selectedRequest : ui.normalRequest
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                                #{r?.id} · {r?.title || "Maintenance request"}
                              </div>

                              <div className="mt-1 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                                    isDark
                                      ? "border border-white/10 bg-white/5 text-slate-300"
                                      : "border border-slate-200 bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {String(r?.category || "other").replaceAll("_", " ")}
                                </span>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] ${statusClasses(
                                    r?.status,
                                    isDark
                                  )}`}
                                >
                                  {String(r?.status || "open").replaceAll("_", " ")}
                                </span>

                                <span
                                  className={`text-[11px] font-semibold ${priorityClasses(
                                    r?.priority,
                                    isDark
                                  )}`}
                                >
                                  {String(r?.priority || "medium").toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className={ui.smallBadge}>
                              {r?.assigned_provider_name
                                ? `Assigned: ${r.assigned_provider_name}`
                                : "Not assigned"}
                            </div>
                          </div>

                          <div className={ui.requestDesc}>
                            {r?.description || "No description provided."}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <section className={ui.sectionCard}>
                <div className="mb-4">
                  <h2 className={ui.sectionTitle}>Providers</h2>
                  <p className={ui.sectionText}>
                    Choose a provider for the currently selected request.
                  </p>
                </div>

                <div className={ui.softBox}>
                  <div className={`mb-3 text-xs font-medium uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Filter Providers
                  </div>

                  <div className="grid gap-3">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={ui.input}
                    >
                      <option value="">All categories</option>
                      {categories.filter(Boolean).map((c) => (
                        <option key={c} value={c}>
                          {c.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>

                    <input
                      value={filterArea}
                      onChange={(e) => setFilterArea(e.target.value)}
                      placeholder="Filter by area"
                      className={ui.input}
                    />
                  </div>
                </div>

                {providersError ? (
                  <div
                    className={`rounded-2xl border p-4 ${
                      isDark
                        ? "border-rose-500/20 bg-rose-500/10"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isDark ? "text-rose-200" : "text-rose-700"}`}>
                      Providers not loading
                    </div>
                    <div className={`mt-1 text-sm ${isDark ? "text-rose-100/90" : "text-rose-600"}`}>
                      {providersError}
                    </div>
                  </div>
                ) : providersLoading ? (
                  <div className={`${ui.softBox} text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Loading providers...
                  </div>
                ) : filteredProviders.length === 0 ? (
                  <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${
                      isDark
                        ? "border-white/10 bg-black/20 text-slate-400"
                        : "border-slate-300 bg-slate-50 text-slate-500"
                    }`}
                  >
                    No providers found.
                  </div>
                ) : (
                  <>
                    <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
                      {filteredProviders.map((p) => {
                        const selected =
                          String(getProviderId(selectedProvider)) === String(getProviderId(p));

                        return (
                          <button
                            key={getProviderId(p)}
                            type="button"
                            onClick={() => setSelectedProvider(p)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              selected ? ui.selectedProvider : ui.normalProvider
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                                  {getProviderName(p)}
                                </div>
                                <div className={`mt-2 space-y-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                  <div>Email: {getProviderEmail(p) || "—"}</div>
                                  <div>Phone: {getProviderPhone(p) || "—"}</div>
                                  <div>
                                    Category:{" "}
                                    {String(getProviderCategory(p) || "other").replaceAll("_", " ")}
                                  </div>
                                  <div>Area: {getProviderArea(p) || "—"}</div>
                                </div>
                              </div>

                              {selected ? (
                                <div
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                    isDark
                                      ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                                      : "border border-emerald-200 bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  Selected
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={assignProvider}
                      disabled={!activeReq?.id || !!(activeReq?.assigned_provider_id || activeReq?.assigned_provider_name)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {activeReq?.assigned_provider_id || activeReq?.assigned_provider_name
                        ? "Provider Already Assigned"
                        : "Assign Selected Provider"}
                    </button>
                  </>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <section className={ui.sectionCard}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className={ui.sectionTitle}>
                      {activeReq?.id ? `Chat · Request #${activeReq.id}` : "Chat"}
                    </h2>
                    <p className={ui.sectionText}>
                      {canChat
                        ? "Message the assigned provider about this maintenance issue."
                        : "Assign a provider first to enable chat."}
                    </p>
                  </div>

                  {activeReq?.assigned_provider_name ? (
                    <div
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        isDark
                          ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                          : "border border-emerald-200 bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {activeReq.assigned_provider_name}
                    </div>
                  ) : null}
                </div>

                <div className={ui.chatWrap}>
                  <div className={ui.chatHead}>
                    <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      <MessageSquare className={`h-4 w-4 ${isDark ? "text-sky-300" : "text-blue-600"}`} />
                      Conversation
                    </div>

                    <button
                      type="button"
                      onClick={() => loadChat(activeReq?.id)}
                      className={ui.chatReload}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reload Chat
                    </button>
                  </div>

                  <div className={ui.chatBody}>
                    {chatLoading ? (
                      <div className={`flex h-full items-center justify-center text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className={ui.emptyChatBox}>
                        <Wrench className={`mb-3 h-8 w-8 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                        <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                          No messages yet
                        </div>
                        <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Start the conversation with the provider below.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((m, idx) => {
                          const msgImage = getMsgImage(m);
                          const msgText = getMsgText(m);
                          const isOwner =
                            String(m?.sender_role || "").toLowerCase() === "owner";

                          return (
                            <div
                              key={m?.id ?? idx}
                              className={`flex ${isOwner ? "justify-end" : "justify-start"}`}
                            >
                              <div className="max-w-[85%]">
                                <div
                                  className={`mb-1 flex items-center gap-2 text-[11px] ${
                                    isOwner
                                      ? `justify-end ${isDark ? "text-sky-200" : "text-blue-700"}`
                                      : `justify-start ${isDark ? "text-slate-300" : "text-slate-600"}`
                                  }`}
                                >
                                  <UserCircle2 className="h-3.5 w-3.5" />
                                  <span className="font-semibold">
                                    {m?.sender_username || m?.sender_email || "User"}
                                  </span>
                                  <span>•</span>
                                  <span className="opacity-80">
                                    {m?.created_at
                                      ? new Date(m.created_at).toLocaleString()
                                      : ""}
                                  </span>
                                </div>

                                <div
                                  className={`rounded-2xl border p-3.5 shadow-sm ${
                                    isOwner
                                      ? isDark
                                        ? "border-sky-400/20 bg-gradient-to-br from-sky-600/20 to-blue-600/10 text-white"
                                        : "border-blue-200 bg-blue-50 text-slate-900"
                                      : isDark
                                      ? "border-white/10 bg-white/5 text-slate-100"
                                      : "border-slate-200 bg-white text-slate-900"
                                  }`}
                                >
                                  {msgImage ? (
                                    <div className="mb-3">
                                      <img
                                        src={msgImage}
                                        alt="chat upload"
                                        className={`max-w-[260px] rounded-2xl ${isDark ? "border border-white/10" : "border border-slate-200"}`}
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                      />
                                    </div>
                                  ) : null}

                                  {msgText ? (
                                    <div className="whitespace-pre-wrap break-words text-sm leading-6">
                                      {msgText}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatBottomRef} />
                      </div>
                    )}
                  </div>

                  <div className={ui.chatFooter}>
                    {!canChat ? (
                      <div
                        className={`mb-3 rounded-2xl px-4 py-3 text-sm ${
                          isDark
                            ? "border border-amber-400/20 bg-amber-500/10 text-amber-200"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        Assign a provider first to start chatting.
                      </div>
                    ) : null}

                    {previewUrl ? (
                      <div className={ui.previewBox}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            Selected Image
                          </div>
                          <button
                            type="button"
                            onClick={clearSelectedImage}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                              isDark
                                ? "border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                                : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                        <img
                          src={previewUrl}
                          alt="preview"
                          className={`max-h-[180px] rounded-2xl ${isDark ? "border border-white/10" : "border border-slate-200"}`}
                        />
                      </div>
                    ) : null}

                    <div className={ui.editorBox}>
                      <textarea
                        ref={textareaRef}
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        rows={4}
                        disabled={!canChat}
                        placeholder={
                          canChat
                            ? "Write your message to the provider..."
                            : "Assign a provider to start chatting..."
                        }
                        className={ui.chatTextarea}
                      />

                      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={!canChat}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              if (!canChat) {
                                setToast({
                                  type: "error",
                                  msg: "Assign a provider first to enable image upload.",
                                });
                                return;
                              }
                              fileInputRef.current?.click();
                            }}
                            className={ui.imageBtn}
                          >
                            <ImagePlus className="h-4 w-4" />
                            Choose Image
                          </button>

                          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {selectedImage ? selectedImage.name : "No image selected"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={sendChat}
                          disabled={sendingChat || !canChat || (!chatText.trim() && !selectedImage)}
                          className={ui.sendBtn}
                        >
                          {sendingChat ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send Message
                            </>
                          )}
                        </button>
                      </div>

                      <div className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Press <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Enter</span> to send and{" "}
                        <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Shift + Enter</span> for a new line.
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className={ui.footer}>
            Smart Rental House Finder · Maintenance Module
          </div>
        </div>
      </div>
    </Shell>
  );
}