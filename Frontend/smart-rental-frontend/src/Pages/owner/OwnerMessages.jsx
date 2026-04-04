import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import {
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Send,
  ImageIcon,
  User,
  X,
  Clock3,
  Home,
  ArrowLeft,
} from "lucide-react";

function getBackendBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
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

function arrify(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statusClasses(status, isDark = false) {
  const st = String(status || "pending").toLowerCase();

  if (st === "accepted") {
    return isDark
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (st === "rejected") {
    return isDark
      ? "bg-red-500/15 text-red-300 border border-red-400/30"
      : "bg-red-50 text-red-700 border border-red-200";
  }

  return isDark
    ? "bg-amber-500/15 text-amber-300 border border-amber-400/30"
    : "bg-amber-50 text-amber-700 border border-amber-200";
}

function prettyStatus(status) {
  const st = String(status || "pending").toLowerCase();
  if (st === "accepted") return "Accepted";
  if (st === "rejected") return "Declined";
  return "Pending";
}

export default function OwnerMessages() {
  const { role } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [active, setActive] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token || role !== "owner") {
      nav("/auth", { replace: true });
    }
  }, [role, nav]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk;
  const getStatus = (b) => String(b?.status ?? b?.state ?? "pending").toLowerCase();
  const getTenantEmail = (b) =>
    b?.tenant_email || b?.tenant?.email || b?.tenant_username || "Tenant";
  const getListingTitle = (b) =>
    b?.listing_title || b?.listing?.title || "Property";
  const getFirstMessage = (b) =>
    b?.first_message || b?.message || b?.latest_message || "";
  const getCreatedAt = (b) => b?.created_at || b?.created || b?.date || "";
  const getMsgText = (m) => m?.text || m?.message || "";
  const getMsgImage = (m) => buildFullMediaUrl(m?.image_url || m?.image || "");
  const getMsgSender = (m) =>
    m?.sender_email || m?.sender?.email || m?.sender_name || m?.sender || "User";

  const formatDate = (s) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

  const isOwnerMessage = (m) => {
    const senderRole = String(m?.sender_role || "").toLowerCase();
    const sender = String(getMsgSender(m) || "").toLowerCase();

    if (senderRole === "owner") return true;
    if (senderRole === "tenant") return false;
    if (sender.includes("owner")) return true;

    return false;
  };

  const loadInbox = async (keepActiveId = null) => {
    setLoading(true);
    try {
      const res = await api.get("owner/booking-requests/");
      const list = arrify(res.data);
      setRequests(list);

      const wantedId = keepActiveId ?? getBookingId(active);
      if (wantedId) {
        const found = list.find((x) => String(getBookingId(x)) === String(wantedId));
        setActive(found || list[0] || null);
      } else {
        setActive(list[0] || null);
      }
    } catch (e) {
      setToast({ type: "error", msg: "Failed to load booking requests." });
      setRequests([]);
      setActive(null);
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (bookingId, options = {}) => {
    if (!bookingId) return;

    const { showLoader = true } = options;

    if (showLoader) setChatLoading(true);

    try {
      const res = await api.get(`booking-requests/${bookingId}/messages/`);
      setMessages(arrify(res.data));
    } catch (e) {
      setMessages([]);
      setToast({ type: "error", msg: "Failed to load chat." });
    } finally {
      if (showLoader) setChatLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = getBookingId(active);
    if (id) loadChat(id, { showLoader: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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

  const sendReply = async () => {
    const bookingId = getBookingId(active);
    if (!bookingId || (!reply.trim() && !selectedImage)) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("text", reply.trim());
      formData.append("message", reply.trim());
      if (selectedImage) formData.append("image", selectedImage);

      await api.post(`booking-requests/${bookingId}/messages/send/`, formData);

      setReply("");
      clearSelectedImage();
      await loadChat(bookingId, { showLoader: false });
      await loadInbox(bookingId);

      setToast({ type: "success", msg: "Reply sent successfully." });

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (e) {
      setToast({ type: "error", msg: "Failed to send reply." });
    } finally {
      setSending(false);
    }
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && (reply.trim() || selectedImage)) {
        sendReply();
      }
    }
  };

  const sendAutoOwnerMessage = async (bookingId, newStatus) => {
    try {
      let autoText = "";

      if (newStatus === "accepted") {
        autoText =
          "Your booking request has been accepted. You can now proceed to the payment step from your tenant side.";
      } else if (newStatus === "rejected") {
        autoText =
          "Your booking request has been declined. Please feel free to contact us for other available options.";
      }

      if (!autoText) return;

      const formData = new FormData();
      formData.append("text", autoText);
      formData.append("message", autoText);

      await api.post(`booking-requests/${bookingId}/messages/send/`, formData);
    } catch (e) {
      console.log("Auto owner message failed:", e);
    }
  };

  const setStatus = async (newStatus) => {
    const bookingId = getBookingId(active);
    if (!bookingId || !active) return;

    const currentStatus = getStatus(active);

    if (currentStatus === newStatus) {
      setToast({
        type: "info",
        msg:
          newStatus === "accepted"
            ? "This request is already accepted."
            : "This request is already declined.",
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      await api.post(`owner/booking-requests/${bookingId}/status/`, {
        status: newStatus,
      });

      await sendAutoOwnerMessage(bookingId, newStatus);

      setToast({
        type: "success",
        msg:
          newStatus === "accepted"
            ? "Application accepted. Tenant can now continue to payment."
            : "Application declined.",
      });

      await loadInbox(bookingId);
      await loadChat(bookingId, { showLoader: false });
    } catch (e) {
      setToast({ type: "error", msg: "Failed to update status." });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const activeId = getBookingId(active);

  const sortedRequests = useMemo(() => {
    return [...(requests || [])].sort((a, b) =>
      String(b?.created_at || b?.created || "").localeCompare(
        String(a?.created_at || a?.created || "")
      )
    );
  }, [requests]);

  return (
    <Shell
      title="Application Hub"
      subtitle="Review booking requests, update status, and chat with applicants."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-[#12345c] text-blue-100 hover:bg-[#163d6d]"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => loadInbox(activeId)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-[#173f73] text-blue-100 hover:bg-[#1a487f]"
                : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <div className="grid min-h-[760px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className={`overflow-hidden rounded-[32px] border shadow-sm ${
            isDark
              ? "border-blue-400/15 bg-[#0f2947]"
              : "border-neutral-200 bg-white"
          }`}
        >
          <div
            className={`border-b px-5 py-5 ${
              isDark ? "border-blue-400/10" : "border-neutral-100"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3
                  className={`text-lg font-black tracking-tight ${
                    isDark ? "text-white" : "text-neutral-900"
                  }`}
                >
                  Incoming Requests
                </h3>
                <p className={`mt-1 text-sm ${isDark ? "text-blue-200/75" : "text-neutral-500"}`}>
                  Select a booking request to review and reply.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                  isDark
                    ? "border-blue-300/20 bg-[#17395f] text-blue-100"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600"
                }`}
              >
                {sortedRequests.length} Total
              </span>
            </div>
          </div>

          <div className="max-h-[700px] space-y-3 overflow-y-auto p-4">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-28 animate-pulse rounded-3xl ${
                    isDark ? "bg-[#17395f]" : "bg-neutral-100"
                  }`}
                />
              ))
            ) : sortedRequests.length === 0 ? (
              <div
                className={`flex min-h-[280px] items-center justify-center px-6 text-center text-sm font-medium ${
                  isDark ? "text-blue-200/70" : "text-neutral-400"
                }`}
              >
                No active booking requests.
              </div>
            ) : (
              sortedRequests.map((b) => {
                const id = getBookingId(b);
                const isActive = String(id) === String(activeId);
                const st = getStatus(b);

                return (
                  <button
                    key={id}
                    onClick={() => setActive(b)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? isDark
                          ? "border-blue-400/50 bg-[#1a4678] shadow-sm"
                          : "border-blue-500 bg-blue-50 shadow-sm"
                        : isDark
                        ? "border-blue-400/10 bg-[#12345c] hover:border-blue-300/25 hover:bg-[#163d6d]"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className={`truncate text-base font-extrabold ${
                            isActive
                              ? isDark
                                ? "text-white"
                                : "text-blue-700"
                              : isDark
                              ? "text-blue-50"
                              : "text-neutral-900"
                          }`}
                        >
                          {getListingTitle(b)}
                        </div>
                        <div
                          className={`mt-1 flex items-center gap-1 text-xs ${
                            isDark ? "text-blue-200/75" : "text-neutral-500"
                          }`}
                        >
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{getTenantEmail(b)}</span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusClasses(
                          st,
                          isDark
                        )}`}
                      >
                        {prettyStatus(st)}
                      </span>
                    </div>

                    <div
                      className={`line-clamp-2 min-h-[34px] text-sm ${
                        isDark ? "text-blue-100/75" : "text-neutral-500"
                      }`}
                    >
                      {getFirstMessage(b) || "No message content..."}
                    </div>

                    <div
                      className={`mt-4 flex items-center justify-between text-[11px] font-semibold ${
                        isDark ? "text-blue-200/55" : "text-neutral-400"
                      }`}
                    >
                      <span>#{id}</span>
                      <span>{formatDate(getCreatedAt(b))}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`flex min-h-[760px] flex-col overflow-hidden rounded-[36px] border shadow-sm ${
            isDark
              ? "border-blue-400/15 bg-[#0f2947]"
              : "border-neutral-200 bg-white"
          }`}
        >
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <div
                className={`mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] ${
                  isDark ? "bg-[#17395f] text-blue-200" : "bg-neutral-100 text-neutral-400"
                }`}
              >
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-neutral-900"}`}>
                Select a request
              </h3>
              <p className={`mt-2 max-w-md ${isDark ? "text-blue-200/75" : "text-neutral-500"}`}>
                Choose a booking request from the left panel to view messages, accept or decline,
                and send a reply.
              </p>
            </div>
          ) : (
            <>
              <div
                className={`border-b px-6 py-6 md:px-8 ${
                  isDark
                    ? "border-blue-400/10 bg-gradient-to-r from-[#12345c] to-[#17395f]"
                    : "border-neutral-100 bg-gradient-to-r from-white to-neutral-50"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3
                        className={`truncate text-2xl font-black tracking-tight ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {getListingTitle(active)}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${statusClasses(
                          getStatus(active),
                          isDark
                        )}`}
                      >
                        {prettyStatus(getStatus(active))}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div
                        className={`rounded-2xl border px-4 py-3 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div
                          className={`mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
                            isDark ? "text-blue-200/65" : "text-neutral-400"
                          }`}
                        >
                          <User className="h-3.5 w-3.5" />
                          Candidate
                        </div>
                        <div
                          className={`break-all text-sm font-semibold ${
                            isDark ? "text-blue-50" : "text-neutral-700"
                          }`}
                        >
                          {getTenantEmail(active)}
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl border px-4 py-3 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div
                          className={`mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
                            isDark ? "text-blue-200/65" : "text-neutral-400"
                          }`}
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          Created
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            isDark ? "text-blue-50" : "text-neutral-700"
                          }`}
                        >
                          {formatDate(getCreatedAt(active))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setStatus("accepted")}
                      disabled={updatingStatus || getStatus(active) === "accepted"}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {getStatus(active) === "accepted" ? "Accepted" : "Accept"}
                    </button>

                    <button
                      onClick={() => setStatus("rejected")}
                      disabled={updatingStatus || getStatus(active) === "rejected"}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isDark
                          ? "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      {getStatus(active) === "rejected" ? "Declined" : "Decline"}
                    </button>
                  </div>
                </div>
              </div>

              {getStatus(active) === "accepted" && (
                <div
                  className={`border-b px-6 py-4 md:px-8 ${
                    isDark
                      ? "border-emerald-400/20 bg-emerald-500/10"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className={`text-sm font-bold ${isDark ? "text-emerald-300" : "text-emerald-800"}`}>
                    This booking request has been accepted.
                  </div>
                  <div className={`mt-1 text-sm ${isDark ? "text-emerald-200/85" : "text-emerald-700"}`}>
                    The tenant should now see the accepted status and continue to the payment step
                    from the tenant side.
                  </div>
                </div>
              )}

              <div
                className={`flex items-center justify-between border-b px-6 py-4 md:px-8 ${
                  isDark ? "border-blue-400/10 bg-[#12345c]" : "border-neutral-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-xl p-2 ${
                      isDark ? "bg-[#1c4e85] text-blue-100" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
                      Conversation
                    </div>
                    <div className={`text-xs ${isDark ? "text-blue-200/70" : "text-neutral-500"}`}>
                      Review the discussion and respond to the tenant.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => activeId && loadChat(activeId, { showLoader: false })}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isDark
                      ? "border-blue-400/15 bg-[#17395f] text-blue-100 hover:bg-[#1a4678]"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload
                </button>
              </div>

              <div className="flex h-[760px] min-h-0 flex-col">
                <div
                  className={`min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8 ${
                    isDark ? "bg-[#0b2340]" : "bg-neutral-50/60"
                  }`}
                >
                  {chatLoading ? (
                    <div className="flex h-full items-center justify-center py-16">
                      <RefreshCw
                        className={`h-8 w-8 animate-spin ${isDark ? "text-blue-200/40" : "text-neutral-300"}`}
                      />
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      className={`flex h-full min-h-[300px] flex-col items-center justify-center rounded-[28px] border border-dashed px-6 text-center ${
                        isDark
                          ? "border-blue-300/20 bg-[#12345c]"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      <div
                        className={`mb-4 rounded-2xl p-4 ${
                          isDark ? "bg-[#17395f] text-blue-200" : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        <Home className="h-8 w-8" />
                      </div>
                      <div className={`text-lg font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
                        No messages yet
                      </div>
                      <div className={`mt-1 max-w-md text-sm ${isDark ? "text-blue-200/75" : "text-neutral-500"}`}>
                        Start the conversation with the tenant from the reply box below.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {messages.map((m, idx) => {
                        const ownerMsg = isOwnerMessage(m);
                        const text = getMsgText(m);
                        const img = getMsgImage(m);

                        return (
                          <div
                            key={m?.id || idx}
                            className={`flex ${ownerMsg ? "justify-end" : "justify-start"}`}
                          >
                            <div className="max-w-[78%] sm:max-w-[72%] lg:max-w-[64%] xl:max-w-[58%]">
                              <div
                                className={`mb-1 flex items-center gap-2 text-[11px] font-semibold ${
                                  ownerMsg
                                    ? isDark
                                      ? "justify-end text-blue-200/80"
                                      : "justify-end text-blue-700"
                                    : isDark
                                    ? "justify-start text-slate-300"
                                    : "justify-start text-neutral-500"
                                }`}
                              >
                                <span className="truncate">{getMsgSender(m)}</span>
                                <span>•</span>
                                <span>{formatDate(m?.created_at || m?.created)}</span>
                              </div>

                              <div
                                className={`rounded-[24px] p-4 shadow-sm md:p-5 ${
                                  ownerMsg
                                    ? isDark
                                      ? "rounded-tr-md border border-sky-300/25 bg-sky-400 text-slate-900"
                                      : "rounded-tr-md border border-sky-200 bg-sky-100 text-sky-950"
                                    : isDark
                                    ? "rounded-tl-md border border-slate-600/40 bg-slate-800 text-slate-100"
                                    : "rounded-tl-md border border-neutral-200 bg-white text-neutral-800"
                                }`}
                              >
                                {img ? (
                                  <img
                                    src={img}
                                    alt="attachment"
                                    className="mb-3 max-h-[260px] w-auto max-w-full rounded-2xl border border-black/10 object-cover"
                                  />
                                ) : null}

                                {text ? (
                                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                                    {text}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={scrollRef} />
                    </div>
                  )}
                </div>

                <div
                  className={`border-t px-5 py-5 md:px-8 ${
                    isDark ? "border-blue-400/10 bg-[#102d50]" : "border-neutral-100 bg-white"
                  }`}
                >
                  {previewUrl ? (
                    <div
                      className={`mb-4 inline-flex items-start gap-3 rounded-2xl border p-3 ${
                        isDark
                          ? "border-blue-300/15 bg-[#17395f]"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <img
                        src={previewUrl}
                        className="h-20 w-20 rounded-2xl object-cover"
                        alt="Preview"
                      />
                      <div className="flex flex-col gap-2">
                        <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-neutral-800"}`}>
                          Image selected
                        </div>
                        <button
                          onClick={clearSelectedImage}
                          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                            isDark
                              ? "border-red-400/25 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={handleReplyKeyDown}
                        placeholder={`Write a reply to ${getTenantEmail(active)}...`}
                        className={`h-[132px] w-full resize-none rounded-[26px] border px-5 py-4 pr-16 text-sm font-medium outline-none transition ${
                          isDark
                            ? "border-blue-300/15 bg-[#0d325c] text-white placeholder:text-blue-200/45 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
                            : "border-neutral-200 bg-neutral-50 text-neutral-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        }`}
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`absolute bottom-4 right-4 rounded-xl border p-2.5 shadow-sm transition ${
                          isDark
                            ? "border-blue-300/15 bg-[#17395f] text-blue-200 hover:text-white"
                            : "border-neutral-200 bg-white text-neutral-500 hover:text-blue-600"
                        }`}
                      >
                        <ImageIcon className="h-5 w-5" />
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>

                    <button
                      onClick={sendReply}
                      disabled={sending || (!reply.trim() && !selectedImage)}
                      className={`inline-flex h-[132px] items-center justify-center gap-3 rounded-[26px] px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isDark
                          ? "bg-sky-500 shadow-sky-900/30 hover:bg-sky-400"
                          : "bg-sky-500 shadow-sky-500/20 hover:bg-sky-600"
                      }`}
                    >
                      {sending ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>

                  <p className={`mt-3 text-xs ${isDark ? "text-blue-200/65" : "text-neutral-500"}`}>
                    Press Enter to send. Press Shift + Enter for a new line.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}