// src/pages/dashboard/OwnerMessages.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function OwnerMessages() {
  const { role } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const [active, setActive] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ---------------------------
  // Guard
  // ---------------------------
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "owner") {
      nav("/unauthorized", { replace: true });
      return;
    }
  }, [role, nav]);

  // ---------------------------
  // Helpers
  // ---------------------------
  const arrify = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk;

  const getStatus = (b) => b?.status ?? b?.state ?? "pending";

  const getTenantEmail = (b) =>
    b?.tenant_email ||
    b?.tenant?.email ||
    b?.tenant_username ||
    b?.tenant?.username ||
    "Tenant";

  const getListingTitle = (b) =>
    b?.listing_title ||
    b?.listing?.title ||
    b?.property_title ||
    b?.property?.title ||
    "Property";

  const getFirstMessage = (b) =>
    b?.first_message || b?.message || b?.text || b?.latest_message || "";

  const getCreatedAt = (b) => b?.created_at || b?.created || b?.date || "";

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

  // ---------------------------
  // Load inbox
  // ---------------------------
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
      setToast({ type: "error", msg: axiosErr(e, "Failed to load booking requests.") });
      setRequests([]);
      setActive(null);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Load chat messages for selected booking
  // ---------------------------
  const loadChat = async (bookingId) => {
    if (!bookingId) return;
    setChatLoading(true);
    try {
      const res = await api.get(`booking-requests/${bookingId}/messages/`);
      setMessages(arrify(res.data));
    } catch (e) {
      setMessages([]);
      setToast({ type: "error", msg: axiosErr(e, "Failed to load messages.") });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = getBookingId(active);
    if (id) loadChat(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ---------------------------
  // Reply message
  // ---------------------------
  const sendReply = async () => {
    const bookingId = getBookingId(active);
    if (!bookingId) {
      setToast({ type: "error", msg: "Booking ID missing." });
      return;
    }
    if (!reply.trim()) {
      setToast({ type: "error", msg: "Write something first." });
      return;
    }

    setSending(true);
    try {
      await api.post(`booking-requests/${bookingId}/messages/send/`, { text: reply.trim() });
      setReply("");
      await loadChat(bookingId);
      await loadInbox(bookingId);
      setToast({ type: "success", msg: "Reply sent ✅" });
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to send reply.") });
    } finally {
      setSending(false);
    }
  };

  // ---------------------------
  // ✅ Accept / Reject (FIXED)
  // Backend endpoint you HAVE:
  // POST /api/owner/booking-requests/<id>/status/
  // body: { status: "accepted" | "rejected" }
  // ---------------------------
  const setStatus = async (newStatus) => {
    const bookingId = getBookingId(active);
    if (!bookingId) return;

    setUpdatingStatus(true);
    try {
      await api.post(`owner/booking-requests/${bookingId}/status/`, { status: newStatus });

      setToast({
        type: "success",
        msg:
          newStatus === "accepted"
            ? "Accepted ✅ Listing removed from home page."
            : "Rejected ✅ Listing will show again if not booked.",
      });

      await loadInbox(bookingId);
      await loadChat(bookingId);
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to update status.") });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  const activeId = getBookingId(active);

  const sortedRequests = useMemo(() => {
    const list = [...(requests || [])];
    list.sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
    return list;
  }, [requests]);

  return (
    <Shell
      title="Tenant Messages"
      subtitle="View booking requests from tenants and reply here."
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => nav("/owner")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            ← Back Dashboard
          </button>
          <button
            onClick={() => loadInbox(activeId)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>
      }
    >
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT: Requests list */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Requests</div>
            <div className="text-xs text-slate-300">
              {loading ? "Loading..." : `${sortedRequests.length} found`}
            </div>
          </div>

          {loading && <div className="text-sm text-slate-300">Loading requests…</div>}

          {!loading && sortedRequests.length === 0 && (
            <div className="text-sm text-slate-300">No booking requests yet.</div>
          )}

          {!loading && sortedRequests.length > 0 && (
            <div className="grid gap-2">
              {sortedRequests.map((b) => {
                const id = getBookingId(b);
                const isActive = id && activeId && String(id) === String(activeId);

                return (
                  <button
                    key={id ?? Math.random()}
                    onClick={() => setActive(b)}
                    className={`text-left rounded-2xl border px-3 py-3 transition ${
                      isActive
                        ? "border-blue-500/40 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white line-clamp-1">
                        {getListingTitle(b)}
                      </div>
                      <div className="text-[11px] text-slate-300">#{id ?? "—"}</div>
                    </div>

                    <div className="mt-1 text-xs text-slate-300 line-clamp-1">
                      From: {getTenantEmail(b)}
                    </div>

                    <div className="mt-2 text-xs text-slate-200/90 line-clamp-2">
                      {getFirstMessage(b) || "—"}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{formatDate(getCreatedAt(b))}</span>
                      <span className="text-[11px] text-slate-200 bg-white/10 border border-white/10 px-2 py-[2px] rounded-full">
                        {getStatus(b)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Chat */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          {!active ? (
            <div className="text-sm text-slate-300">Select a request to view messages.</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {getListingTitle(active)}{" "}
                    <span className="text-sm text-slate-300">• #{activeId ?? "—"}</span>
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    Tenant: <span className="text-slate-200">{getTenantEmail(active)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus("accepted")}
                    disabled={updatingStatus}
                    className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-200 hover:bg-green-500/15 transition disabled:opacity-60"
                  >
                    {updatingStatus ? "Working..." : "Accept"}
                  </button>
                  <button
                    onClick={() => setStatus("rejected")}
                    disabled={updatingStatus}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15 transition disabled:opacity-60"
                  >
                    {updatingStatus ? "Working..." : "Reject"}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 min-h-[320px]">
                {chatLoading ? (
                  <div className="text-sm text-slate-300">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-300">No chat messages yet.</div>
                ) : (
                  <div className="grid gap-2">
                    {messages.map((m, idx) => {
                      const text = m?.text || m?.message || m?.body || "";
                      const sender =
                        m?.sender_email || m?.sender?.email || m?.sender_name || m?.sender || "User";
                      const created = formatDate(m?.created_at || m?.created || "");

                      return (
                        <div key={m?.id ?? idx} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-slate-200">{sender}</div>
                            <div className="text-[11px] text-slate-400">{created}</div>
                          </div>
                          <div className="mt-1 text-sm text-slate-100 whitespace-pre-wrap">{text || "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reply box */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">Reply</div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  placeholder="Write your reply..."
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={sendReply}
                    disabled={sending}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Send Reply"}
                  </button>
                  <button
                    onClick={() => loadChat(activeId)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                  >
                    Reload Chat
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
