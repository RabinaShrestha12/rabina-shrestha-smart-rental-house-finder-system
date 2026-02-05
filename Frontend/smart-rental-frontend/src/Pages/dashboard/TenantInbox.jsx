// src/pages/dashboard/TenantInbox.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function TenantInbox() {
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

  // ---------------------------
  // Guard
  // ---------------------------
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
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

  const getListingTitle = (b) =>
    b?.listing_title || b?.listing?.title || b?.property_title || "Property";

  const getOwnerEmail = (b) =>
    b?.owner_email || b?.listing?.owner?.email || b?.owner?.email || "Owner";

  const getFirstMessage = (b) =>
    b?.first_message || b?.message || b?.text || b?.latest_message || "";

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
  // Load tenant inbox
  // ---------------------------
  const loadInbox = async () => {
    setLoading(true);
    try {
      // ✅ GET /api/tenant/booking-requests/
      const res = await api.get("tenant/booking-requests/");
      const list = arrify(res.data);
      setRequests(list);
      if (list.length && !active) setActive(list[0]);
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to load your inbox.") });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Load chat messages
  // ---------------------------
  const loadChat = async (bookingId) => {
    if (!bookingId) return;
    setChatLoading(true);
    try {
      // ✅ GET /api/booking-requests/<id>/messages/
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
  // Send message (tenant reply)
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
      // ✅ POST /api/booking-requests/<id>/messages/send/
      await api.post(`booking-requests/${bookingId}/messages/send/`, {
        text: reply.trim(),
      });

      setReply("");
      await loadChat(bookingId);
      await loadInbox();
      setToast({ type: "success", msg: "Message sent ✅" });
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to send message.") });
    } finally {
      setSending(false);
    }
  };

  const activeId = getBookingId(active);

  const sortedRequests = useMemo(() => {
    const list = [...(requests || [])];
    list.sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
    return list;
  }, [requests]);

  return (
    <Shell
      title="My Inbox"
      subtitle="See owner replies and continue conversation here."
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            ← Back
          </button>
          <button
            onClick={loadInbox}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>
      }
    >
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT: request list */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">My Requests</div>
            <div className="text-xs text-slate-300">{loading ? "Loading..." : `${sortedRequests.length} found`}</div>
          </div>

          {loading && <div className="text-sm text-slate-300">Loading…</div>}

          {!loading && sortedRequests.length === 0 && (
            <div className="text-sm text-slate-300">No requests yet.</div>
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
                      isActive ? "border-blue-500/40 bg-blue-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white line-clamp-1">{getListingTitle(b)}</div>
                      <div className="text-[11px] text-slate-300">#{id ?? "—"}</div>
                    </div>

                    <div className="mt-1 text-xs text-slate-300 line-clamp-1">
                      Owner: {getOwnerEmail(b)}
                    </div>

                    <div className="mt-2 text-xs text-slate-200/90 line-clamp-2">{getFirstMessage(b) || "—"}</div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{formatDate(b?.created_at)}</span>
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

        {/* RIGHT: chat */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          {!active ? (
            <div className="text-sm text-slate-300">Select a request to view the chat.</div>
          ) : (
            <>
              <div>
                <div className="text-lg font-semibold text-white">
                  {getListingTitle(active)}{" "}
                  <span className="text-sm text-slate-300">• #{activeId ?? "—"}</span>
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  Status: <span className="text-slate-200">{getStatus(active)}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 min-h-[320px]">
                {chatLoading ? (
                  <div className="text-sm text-slate-300">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-300">No messages yet.</div>
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

              {/* reply */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">Send Message</div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  placeholder="Write your message..."
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={sendReply}
                    disabled={sending}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Send"}
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
