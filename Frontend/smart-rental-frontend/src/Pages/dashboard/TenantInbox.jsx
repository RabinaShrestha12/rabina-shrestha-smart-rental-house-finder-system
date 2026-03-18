import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function TenantInbox() {
  const { role, isAuthed } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

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

  const arrify = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk ?? null;

  const getStatus = (b) =>
    String(b?.status ?? b?.state ?? "pending").toLowerCase();

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
    if (status === "accepted" || status === "approved" || status === "confirmed") {
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    }
    if (status === "rejected" || status === "cancelled") {
      return "border-red-400/20 bg-red-500/10 text-red-200";
    }
    if (status === "closed") {
      return "border-slate-400/20 bg-slate-500/10 text-slate-200";
    }
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  };

  const loadInbox = async () => {
    setLoading(true);
    try {
      const res = await api.get("tenant/booking-requests/");
      const list = arrify(res.data);
      setRequests(list);

      const openId = searchParams.get("open");

      if (openId) {
        const found = list.find((x) => String(getBookingId(x)) === String(openId));
        if (found) {
          setActive(found);
          return;
        }
      }

      if (list.length) {
        if (!active) {
          setActive(list[0]);
        } else {
          const refreshedActive = list.find(
            (x) => String(getBookingId(x)) === String(getBookingId(active))
          );
          setActive(refreshedActive || list[0]);
        }
      } else {
        setActive(null);
      }
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to load your inbox.") });
      setRequests([]);
      setActive(null);
    } finally {
      setLoading(false);
    }
  };

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
    else setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
    activeStatus === "confirmed";

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

  return (
    <Shell
      title="My Inbox"
      subtitle="See owner replies, track booking status, and continue conversation here."
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            ← Back
          </button>

          <button
            onClick={loadInbox}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
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

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4">
            <div className="text-base font-semibold text-white">My Requests</div>
            <div className="mt-1 text-xs text-slate-300">
              {loading ? "Loading..." : `${filteredRequests.length} found`}
            </div>
          </div>

          <div className="grid gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search property, owner, location..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/40"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="approved">Approved</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {loading && <div className="text-sm text-slate-300">Loading…</div>}

            {!loading && filteredRequests.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                No requests yet.
              </div>
            )}

            {!loading &&
              filteredRequests.map((b) => {
                const id = getBookingId(b);
                const isActive = id && activeId && String(id) === String(activeId);

                return (
                  <button
                    key={id ?? Math.random()}
                    onClick={() => setActive(b)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 transition ${
                      isActive
                        ? "border-blue-500/40 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white line-clamp-1">
                        {getListingTitle(b)}
                      </div>
                      <div className="text-[11px] text-slate-300">#{id ?? "—"}</div>
                    </div>

                    <div className="mt-1 text-xs text-slate-300 line-clamp-1">
                      Owner: {getOwnerEmail(b)}
                    </div>

                    <div className="mt-1 text-xs text-slate-400 line-clamp-1">
                      📍 {getListingAddress(b)}
                    </div>

                    <div className="mt-2 text-xs text-slate-200/90 line-clamp-2">
                      {getFirstMessage(b) || "—"}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2 py-[3px] text-[11px] ${badgeClass(
                          getStatus(b)
                        )}`}
                      >
                        {getStatus(b)}
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {formatDate(b?.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          {!active ? (
            <div className="text-sm text-slate-300">
              Select a request to view the chat.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {getListingTitle(active)}{" "}
                      <span className="text-sm text-slate-300">• #{activeId ?? "—"}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-300">
                      Owner: <span className="text-slate-100">{getOwnerName(active)}</span>
                    </div>

                    <div className="mt-1 text-sm text-slate-300">
                      Location:{" "}
                      <span className="text-slate-100">{getListingAddress(active)}</span>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeClass(
                        activeStatus
                      )}`}
                    >
                      {activeStatus}
                    </span>
                  </div>
                </div>
              </div>

              {canPay && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="text-base font-semibold text-white">
                    Payment Available
                  </div>

                  <div className="mt-1 text-sm text-slate-200">
                    Your booking request has been accepted. You can now proceed to payment.
                  </div>

                  <div className="mt-3 text-sm text-slate-100">
                    Amount:{" "}
                    <span className="font-semibold">
                      Rs {getPaymentAmount(active) || "Not set"}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={openPayment}
                      className="rounded-2xl border border-emerald-400/20 bg-emerald-500/20 px-4 py-2 text-sm text-white hover:bg-emerald-500/30 transition"
                    >
                      Pay Now
                    </button>

                    <button
                      onClick={openProperty}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
                    >
                      View Property
                    </button>
                  </div>
                </div>
              )}

              {!canPay && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button
                    onClick={openProperty}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
                  >
                    View Property
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 min-h-[320px]">
                <div className="mb-3 text-sm font-semibold text-white">
                  Conversation
                </div>

                {chatLoading ? (
                  <div className="text-sm text-slate-300">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-300">No messages yet.</div>
                ) : (
                  <div className="grid gap-2">
                    {messages.map((m, idx) => {
                      const text = m?.text || m?.message || m?.body || "";
                      const sender =
                        m?.sender_email ||
                        m?.sender?.email ||
                        m?.sender_name ||
                        m?.sender ||
                        "User";
                      const created = formatDate(m?.created_at || m?.created || "");

                      const senderRole = String(
                        m?.sender_role || m?.role || ""
                      ).toLowerCase();

                      const isMine = senderRole === "tenant";

                      return (
                        <div
                          key={m?.id ?? idx}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl border p-3 ${
                              isMine
                                ? "border-purple-400/20 bg-purple-500/10"
                                : "border-white/10 bg-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-semibold text-slate-200">
                                {sender}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {created}
                              </div>
                            </div>

                            <div className="mt-1 text-sm text-slate-100 whitespace-pre-wrap">
                              {text || "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">Send Message</div>

                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  placeholder="Write your message..."
                />

                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    onClick={sendReply}
                    disabled={sending}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>

                  <button
                    onClick={() => loadChat(activeId)}
                    disabled={!activeId}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition disabled:opacity-60"
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