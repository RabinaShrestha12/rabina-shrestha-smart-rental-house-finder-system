import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";

function getBackendBaseUrl() {
  const envUrl =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    "http://127.0.0.1:8000";

  return String(envUrl).replace(/\/+$/, "");
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

const UNREAD_STORAGE_KEY = "tenant_inbox_unread_counts";
const LAST_SEEN_STORAGE_KEY = "tenant_inbox_last_seen";

export default function TenantInbox() {
  const { role, isAuthed } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const [active, setActive] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [unreadMap, setUnreadMap] = useState(() => {
    try {
      const saved = localStorage.getItem(UNREAD_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [lastSeenMap, setLastSeenMap] = useState(() => {
    try {
      const saved = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(unreadMap));
  }, [unreadMap]);

  useEffect(() => {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(lastSeenMap));
  }, [lastSeenMap]);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token || !isAuthed) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
      nav("/unauthorized", { replace: true });
      return;
    }
  }, [role, isAuthed, nav]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const arrify = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk ?? null;

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const getStatus = (b) =>
    normalizeStatus(
      b?.status ??
        b?.state ??
        b?.booking_status ??
        b?.request_status ??
        "pending"
    );

  const getListingId = (b) =>
    b?.listing_id ??
    b?.listing?.id ??
    b?.listing?.pk ??
    b?.property_id ??
    null;

  const getListingTitle = (b) =>
    b?.listing_title ||
    b?.listing?.title ||
    b?.property_title ||
    b?.property_name ||
    "Property";

  const getListingAddress = (b) =>
    b?.listing_address ||
    b?.listing?.address ||
    b?.listing?.location ||
    b?.location ||
    "—";

  const getOwnerName = (b) =>
    b?.owner_name ||
    b?.owner?.name ||
    b?.listing?.owner?.name ||
    "Owner";

  const getOwnerEmail = (b) =>
    b?.owner_email ||
    b?.listing?.owner?.email ||
    b?.owner?.email ||
    "Owner";

  const getFirstMessage = (b) =>
    b?.first_message || b?.message || b?.text || b?.latest_message || "";

  const getPaymentAmount = (b) =>
    b?.payment_amount ??
    b?.advance_amount ??
    b?.booking_amount ??
    b?.listing?.rent ??
    b?.listing?.price ??
    "";

  const getMsgText = (m) => m?.text || m?.message || m?.body || "";

  const getMsgImage = (m) => {
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
  };

  const getMsgSenderRole = (m) =>
    String(m?.sender_role || m?.role || "").trim().toLowerCase();

  const getMsgCreatedAt = (m) =>
    m?.created_at || m?.created || m?.timestamp || m?.sent_at || "";

  const formatDate = (s) => {
    if (!s) return "";
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return String(s);
      return d.toLocaleString();
    } catch {
      return String(s);
    }
  };

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  const badgeClass = (status) => {
    if (
      ["accepted", "approved", "confirmed", "payment_pending", "awaiting_payment"].includes(
        status
      )
    ) {
      return isDark
        ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
        : "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (["rejected", "cancelled", "canceled", "declined"].includes(status)) {
      return isDark
        ? "border border-red-400/30 bg-red-500/15 text-red-100"
        : "border border-red-200 bg-red-50 text-red-700";
    }

    if (status === "closed") {
      return isDark
        ? "border border-slate-400/30 bg-slate-500/15 text-slate-100"
        : "border border-slate-200 bg-slate-100 text-slate-700";
    }

    return isDark
      ? "border border-amber-400/30 bg-amber-500/15 text-amber-100"
      : "border border-amber-200 bg-amber-50 text-amber-700";
  };

  const getLatestIncomingMessageMeta = async (bookingId) => {
    try {
      const res = await api.get(`booking-requests/${bookingId}/messages/`);
      const list = arrify(res.data);

      const ownerMessages = list.filter((m) => getMsgSenderRole(m) !== "tenant");
      if (!ownerMessages.length) {
        return { latestOwnerAt: "", latestOwnerId: null };
      }

      const latestOwnerMessage = [...ownerMessages].sort((a, b) => {
        const aTime = new Date(getMsgCreatedAt(a) || 0).getTime();
        const bTime = new Date(getMsgCreatedAt(b) || 0).getTime();
        return bTime - aTime;
      })[0];

      return {
        latestOwnerAt: getMsgCreatedAt(latestOwnerMessage) || "",
        latestOwnerId: latestOwnerMessage?.id ?? null,
      };
    } catch {
      return { latestOwnerAt: "", latestOwnerId: null };
    }
  };

  const markThreadAsRead = async (bookingId) => {
    if (!bookingId) return;

    try {
      const res = await api.get(`booking-requests/${bookingId}/messages/`);
      const list = arrify(res.data);
      setMessages(list);

      const ownerMessages = list.filter((m) => getMsgSenderRole(m) !== "tenant");
      const latestOwnerMessage = [...ownerMessages].sort((a, b) => {
        const aTime = new Date(getMsgCreatedAt(a) || 0).getTime();
        const bTime = new Date(getMsgCreatedAt(b) || 0).getTime();
        return bTime - aTime;
      })[0];

      setUnreadMap((prev) => ({
        ...prev,
        [bookingId]: 0,
      }));

      if (latestOwnerMessage) {
        setLastSeenMap((prev) => ({
          ...prev,
          [bookingId]: {
            last_seen_at: getMsgCreatedAt(latestOwnerMessage) || "",
            last_seen_id: latestOwnerMessage?.id ?? null,
          },
        }));
      }
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to mark messages as read.") });
    }
  };

  const refreshUnreadCounts = async (inboxList, openedBookingId = null) => {
    if (!Array.isArray(inboxList) || inboxList.length === 0) return;

    const unreadUpdates = {};
    const lastSeenUpdates = {};

    await Promise.all(
      inboxList.map(async (booking) => {
        const bookingId = getBookingId(booking);
        if (!bookingId) return;

        const { latestOwnerAt, latestOwnerId } = await getLatestIncomingMessageMeta(bookingId);
        const seen = lastSeenMap?.[bookingId];

        if (!latestOwnerAt && !latestOwnerId) {
          unreadUpdates[bookingId] = 0;
          return;
        }

        if (String(bookingId) === String(openedBookingId)) {
          unreadUpdates[bookingId] = 0;
          lastSeenUpdates[bookingId] = {
            last_seen_at: latestOwnerAt,
            last_seen_id: latestOwnerId,
          };
          return;
        }

        const sameMessage =
          seen &&
          ((seen?.last_seen_id &&
            latestOwnerId &&
            String(seen.last_seen_id) === String(latestOwnerId)) ||
            (seen?.last_seen_at &&
              latestOwnerAt &&
              String(seen.last_seen_at) === String(latestOwnerAt)));

        unreadUpdates[bookingId] = sameMessage ? 0 : 1;
      })
    );

    setUnreadMap((prev) => ({
      ...prev,
      ...unreadUpdates,
    }));

    if (Object.keys(lastSeenUpdates).length) {
      setLastSeenMap((prev) => ({
        ...prev,
        ...lastSeenUpdates,
      }));
    }
  };

  const loadInbox = async (opts = {}) => {
    const { silent = false } = opts;

    if (!silent) setLoading(true);

    try {
      const res = await api.get("tenant/booking-requests/");
      const list = arrify(res.data);
      setRequests(list);

      const openId = searchParams.get("open");
      let nextActive = active;

      if (openId) {
        const found = list.find((x) => String(getBookingId(x)) === String(openId));
        if (found) {
          nextActive = found;
          setActive(found);
        }
      } else if (list.length) {
        if (!active) {
          nextActive = list[0];
          setActive(list[0]);
        } else {
          const refreshedActive = list.find(
            (x) => String(getBookingId(x)) === String(getBookingId(active))
          );
          nextActive = refreshedActive || list[0];
          setActive(nextActive);
        }
      } else {
        nextActive = null;
        setActive(null);
      }

      await refreshUnreadCounts(list, getBookingId(nextActive));
    } catch (e) {
      if (!silent) {
        setToast({ type: "error", msg: axiosErr(e, "Failed to load your inbox.") });
      }
      setRequests([]);
      setActive(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadChat = async (bookingId, options = {}) => {
    if (!bookingId) return;

    const { markRead = true, showLoader = true } = options;

    if (showLoader) setChatLoading(true);

    try {
      const res = await api.get(`booking-requests/${bookingId}/messages/`);
      const list = arrify(res.data);
      setMessages(list);

      if (markRead) {
        const ownerMessages = list.filter((m) => getMsgSenderRole(m) !== "tenant");
        const latestOwnerMessage = [...ownerMessages].sort((a, b) => {
          const aTime = new Date(getMsgCreatedAt(a) || 0).getTime();
          const bTime = new Date(getMsgCreatedAt(b) || 0).getTime();
          return bTime - aTime;
        })[0];

        setUnreadMap((prev) => ({
          ...prev,
          [bookingId]: 0,
        }));

        if (latestOwnerMessage) {
          setLastSeenMap((prev) => ({
            ...prev,
            [bookingId]: {
              last_seen_at: getMsgCreatedAt(latestOwnerMessage) || "",
              last_seen_id: latestOwnerMessage?.id ?? null,
            },
          }));
        }
      }
    } catch (e) {
      setMessages([]);
      setToast({ type: "error", msg: axiosErr(e, "Failed to load messages.") });
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
    if (id) {
      loadChat(id, { markRead: true, showLoader: true });
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadInbox({ silent: true });

      const currentActiveId = getBookingId(active);
      if (currentActiveId) {
        loadChat(currentActiveId, { markRead: true, showLoader: false });
      }
    }, 7000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lastSeenMap]);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendReply = async () => {
    const bookingId = getBookingId(active);

    if (!bookingId) {
      setToast({ type: "error", msg: "Booking ID missing." });
      return;
    }

    if (!reply.trim() && !selectedImage) {
      setToast({ type: "error", msg: "Write a message or choose an image first." });
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("text", reply.trim());
      formData.append("message", reply.trim());

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      await api.post(`booking-requests/${bookingId}/messages/send/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setReply("");
      clearSelectedImage();

      await loadChat(bookingId, { markRead: true, showLoader: false });
      await loadInbox({ silent: true });

      setToast({ type: "success", msg: "Message sent ✅" });

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to send message.") });
    } finally {
      setSending(false);
    }
  };

  const handleReplyKeyDown = async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) {
        await sendReply();
      }
    }
  };

  const openPayment = () => {
    const bookingId = getBookingId(active);
    if (!bookingId) {
      setToast({ type: "error", msg: "Booking id not found." });
      return;
    }
    nav(`/tenant/payment/${bookingId}`);
  };

  const openProperty = () => {
    const listingId = getListingId(active);
    if (!listingId) {
      setToast({ type: "error", msg: "Listing id not found for this booking." });
      return;
    }
    nav(`/public/listings/${listingId}`);
  };

  const activeId = getBookingId(active);
  const activeStatus = getStatus(active);

  const canPay =
    activeStatus === "accepted" ||
    activeStatus === "approved" ||
    activeStatus === "confirmed" ||
    activeStatus === "payment_pending" ||
    activeStatus === "awaiting_payment";

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = [...(requests || [])];

    if (statusFilter !== "all") {
      list = list.filter((b) => getStatus(b) === statusFilter);
    }

    list.sort((a, b) =>
      String(b?.created_at || "").localeCompare(String(a?.created_at || ""))
    );

    if (!q) return list;

    return list.filter((b) => {
      const title = getListingTitle(b).toLowerCase();
      const owner = getOwnerName(b).toLowerCase();
      const email = getOwnerEmail(b).toLowerCase();
      const address = getListingAddress(b).toLowerCase();
      const firstMessage = getFirstMessage(b).toLowerCase();

      return (
        title.includes(q) ||
        owner.includes(q) ||
        email.includes(q) ||
        address.includes(q) ||
        firstMessage.includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const totalUnread = useMemo(() => {
    return Object.values(unreadMap || {}).reduce((sum, count) => sum + Number(count || 0), 0);
  }, [unreadMap]);

  const colors = {
    pageCard: isDark
      ? "border border-[#214c7a] bg-[#12345a] text-white"
      : "border border-slate-200 bg-white text-slate-900",
    innerCard: isDark
      ? "border border-[#2c5d92] bg-[#183d68] text-white"
      : "border border-slate-200 bg-slate-50 text-slate-900",
    softCard: isDark
      ? "border border-[#315f90] bg-[#102d4d] text-white"
      : "border border-slate-200 bg-white text-slate-900",
    input: isDark
      ? "border border-[#3d6c9f] bg-[#0f2b49] text-white placeholder:text-slate-300"
      : "border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
    button: isDark
      ? "border border-[#3a6ba0] bg-[#15365d] text-white hover:bg-[#1b4574]"
      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    muted: isDark ? "text-slate-200" : "text-slate-600",
    muted2: isDark ? "text-slate-300" : "text-slate-500",
    convoWrap: isDark
      ? "border border-[#315f90] bg-[#102d4d]"
      : "border border-slate-200 bg-slate-50",
    myMsg: isDark
      ? "border border-sky-400/30 bg-sky-500/20 text-white"
      : "border border-blue-200 bg-blue-50 text-slate-900",
    otherMsg: isDark
      ? "border border-[#426d9d] bg-[#183d68] text-white"
      : "border border-slate-200 bg-white text-slate-900",
  };

  return (
    <Shell
      title="My Inbox"
      subtitle="See owner replies, track booking status, and continue conversation here."
      right={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => nav("/tenant")}
            type="button"
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${colors.button}`}
          >
            ← Back
          </button>

          <button
            onClick={() => loadInbox()}
            type="button"
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${colors.button}`}
          >
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

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className={`rounded-3xl p-4 shadow-sm ${colors.pageCard}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">My Requests</div>
              <div className={`mt-1 text-xs ${colors.muted2}`}>
                {loading ? "Loading..." : `${filteredRequests.length} found`}
              </div>
            </div>

            <div
              className={
                isDark
                  ? "rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-100"
                  : "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
              }
            >
              Inbox {totalUnread > 0 ? `(${totalUnread})` : ""}
            </div>
          </div>

          <div className="grid gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search property, owner, location..."
              className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition ${colors.input}`}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition ${colors.input}`}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="approved">Approved</option>
              <option value="confirmed">Confirmed</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="mt-4 max-h-[72vh] space-y-3 overflow-y-auto pr-1">
            {loading && <div className={`text-sm ${colors.muted2}`}>Loading…</div>}

            {!loading && filteredRequests.length === 0 && (
              <div className={`rounded-2xl p-4 text-sm ${colors.innerCard}`}>
                No requests yet.
              </div>
            )}

            {!loading &&
              filteredRequests.map((b) => {
                const id = getBookingId(b);
                const isActive = id && activeId && String(id) === String(activeId);
                const unreadCount = unreadMap?.[id] || 0;

                return (
                  <button
                    key={id ?? Math.random()}
                    onClick={async () => {
                      setActive(b);
                      if (id) {
                        await markThreadAsRead(id);
                      }
                    }}
                    type="button"
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      isActive
                        ? isDark
                          ? "border border-sky-400/40 bg-[#1a4775] shadow-sm text-white"
                          : "border border-blue-300 bg-blue-50 shadow-sm text-slate-900"
                        : colors.softCard
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="line-clamp-1 text-sm font-semibold">
                        {getListingTitle(b)}
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <span className="min-w-[22px] rounded-full bg-red-500 px-2 py-[2px] text-center text-[11px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                        <div className={`text-[11px] ${colors.muted2}`}>#{id ?? "—"}</div>
                      </div>
                    </div>

                    <div className={`mt-1 line-clamp-1 text-xs ${colors.muted}`}>
                      Owner: {getOwnerEmail(b)}
                    </div>

                    <div className={`mt-1 line-clamp-1 text-xs ${colors.muted2}`}>
                      📍 {getListingAddress(b)}
                    </div>

                    <div className={`mt-2 line-clamp-2 text-xs ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                      {getFirstMessage(b) || "—"}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-[3px] text-[11px] ${badgeClass(getStatus(b))}`}>
                        {getStatus(b).replace(/_/g, " ")}
                      </span>

                      <span className={`text-[11px] ${colors.muted2}`}>
                        {formatDate(b?.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        <div className={`rounded-3xl p-4 shadow-sm ${colors.pageCard}`}>
          {!active ? (
            <div className={`text-sm ${colors.muted}`}>Select a request to view the chat.</div>
          ) : (
            <div className="flex h-[760px] flex-col">
              <div className={`rounded-2xl p-4 ${colors.innerCard}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-semibold">
                      {getListingTitle(active)}{" "}
                      <span className={`text-sm ${colors.muted2}`}>• #{activeId ?? "—"}</span>
                    </div>

                    <div className={`mt-1 text-sm ${colors.muted}`}>
                      Owner:{" "}
                      <span className={isDark ? "text-white" : "text-slate-900"}>
                        {getOwnerName(active)}
                      </span>
                    </div>

                    <div className={`mt-1 text-sm ${colors.muted}`}>
                      Location:{" "}
                      <span className={isDark ? "text-white" : "text-slate-900"}>
                        {getListingAddress(active)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badgeClass(
                        activeStatus
                      )}`}
                    >
                      {activeStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>

              {canPay && (
                <div
                  className={
                    isDark
                      ? "mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/12 p-4"
                      : "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                  }
                >
                  <div className={`text-base font-semibold ${isDark ? "text-white" : "text-emerald-800"}`}>
                    Payment Available
                  </div>

                  <div className={`mt-1 text-sm ${isDark ? "text-slate-100" : "text-emerald-700"}`}>
                    Your booking request has been accepted. You can now proceed to payment.
                  </div>

                  <div className={`mt-3 text-sm ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                    Amount: <span className="font-semibold">Rs {getPaymentAmount(active) || "Not set"}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={openPayment}
                      type="button"
                      className="rounded-2xl border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Pay Now
                    </button>

                    <button
                      onClick={openProperty}
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${colors.button}`}
                    >
                      View Property
                    </button>
                  </div>
                </div>
              )}

              {!canPay && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={openProperty}
                    type="button"
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${colors.button}`}
                  >
                    View Property
                  </button>
                </div>
              )}

              <div className={`mt-4 flex min-h-0 flex-1 flex-col rounded-2xl ${colors.convoWrap}`}>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                  <div className="text-sm font-semibold">Conversation</div>

                  {activeId && (unreadMap?.[activeId] || 0) > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-1 text-[11px] font-bold text-white">
                      {unreadMap?.[activeId]} new
                    </span>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {chatLoading ? (
                    <div className={`text-sm ${colors.muted}`}>Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className={`text-sm ${colors.muted}`}>No messages yet.</div>
                  ) : (
                    <div className="grid gap-2">
                      {messages.map((m, idx) => {
                        const text = getMsgText(m);
                        const imageUrl = getMsgImage(m);
                        const sender =
                          m?.sender_email ||
                          m?.sender?.email ||
                          m?.sender_name ||
                          m?.sender ||
                          "User";
                        const created = formatDate(m?.created_at || m?.created || "");
                        const senderRole = getMsgSenderRole(m);
                        const isMine = senderRole === "tenant";

                        return (
                          <div
                            key={m?.id ?? idx}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${
                                isMine ? colors.myMsg : colors.otherMsg
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className={`text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                                  {sender}
                                </div>
                                <div className={`text-[11px] ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                                  {created}
                                </div>
                              </div>

                              {imageUrl ? (
                                <div className="mt-3">
                                  <img
                                    src={imageUrl}
                                    alt="chat upload"
                                    className={`max-w-[220px] rounded-2xl border ${
                                      isDark ? "border-[#5077a1]" : "border-slate-200"
                                    }`}
                                    onError={(e) => {
                                      console.log("TenantInbox image failed:", imageUrl, m);
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : null}

                              {text ? (
                                <div className={`mt-2 whitespace-pre-wrap break-words text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                                  {text}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className={`border-t px-4 py-3 ${isDark ? "border-white/10" : "border-slate-200"} ${colors.innerCard}`}>
                  <div className="text-sm font-semibold">Send Message</div>

                  <textarea
                    ref={textareaRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    rows={3}
                    className={`mt-2 w-full rounded-2xl px-3 py-2 text-sm outline-none ${colors.input}`}
                    placeholder="Write your message..."
                  />

                  <div className={`mt-2 text-xs ${colors.muted2}`}>
                    Press <span className="font-semibold">Enter</span> to send and{" "}
                    <span className="font-semibold">Shift + Enter</span> for a new line.
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${colors.button}`}
                    >
                      Choose Image
                    </button>

                    {selectedImage ? (
                      <span className={`break-all text-xs ${colors.muted}`}>
                        {selectedImage.name}
                      </span>
                    ) : (
                      <span className={`text-xs ${colors.muted2}`}>No image selected</span>
                    )}
                  </div>

                  {previewUrl && (
                    <div className={`mt-3 rounded-2xl p-3 ${colors.softCard}`}>
                      <div className={`mb-2 text-xs ${colors.muted}`}>Image preview</div>
                      <img
                        src={previewUrl}
                        alt="preview"
                        className={`max-w-[180px] rounded-2xl border ${
                          isDark ? "border-[#5077a1]" : "border-slate-200"
                        }`}
                      />
                      <div className="mt-2">
                        <button
                          onClick={clearSelectedImage}
                          type="button"
                          className={
                            isDark
                              ? "rounded-xl border border-red-400/30 bg-red-500/12 px-3 py-1 text-xs text-red-100 transition hover:bg-red-500/18"
                              : "rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 transition hover:bg-red-100"
                          }
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={sendReply}
                      disabled={sending}
                      type="button"
                      className="rounded-2xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>

                    <button
                      onClick={sendReply}
                      disabled={sending}
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${colors.button}`}
                    >
                      OK
                    </button>

                    <button
                      onClick={() => loadChat(activeId, { markRead: true, showLoader: false })}
                      disabled={!activeId}
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${colors.button}`}
                    >
                      Reload Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}