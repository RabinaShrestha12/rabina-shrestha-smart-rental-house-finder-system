// src/pages/dashboard/TenantDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import api from "../../api/axios";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) return "/no-image.png";
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://"))
    return s.replace(/^\/media\//, "");
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

export default function TenantDashboard() {
  const { role, email, logout, isAuthed } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");

  // contact modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // message
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  // ✅ Notifications
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsError, setNotifsError] = useState("");

  // ✅ Maintenance (tenant help)
  const [showHelp, setShowHelp] = useState(false);
  const [helpListing, setHelpListing] = useState(null);
  const [helpType, setHelpType] = useState("plumbing");
  const [helpMsg, setHelpMsg] = useState("");
  const [helpSending, setHelpSending] = useState(false);

  // ✅ Tenant maintenance list (optional)
  const [myMaint, setMyMaint] = useState([]);
  const [myMaintLoading, setMyMaintLoading] = useState(false);
  const [myMaintError, setMyMaintError] = useState("");

  useEffect(() => {
    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
      nav("/unauthorized", { replace: true });
      return;
    }
  }, [isAuthed, role, nav]);

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  const safeArr = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getId = (item) => item?.id ?? item?.pk ?? item?.listing_id ?? item?.property_id;

  const getTitle = (x) => x?.title || x?.property_name || x?.name || "Property";
  const getAddress = (x) => x?.address || x?.location || x?.city || x?.area || "—";
  const getRent = (x) => x?.rent ?? x?.price ?? x?.monthly_rent ?? null;

  const getImage = (x) =>
    x?.image_url ||
    x?.image ||
    x?.cover ||
    x?.thumbnail ||
    x?.main_image ||
    x?.photo ||
    x?.pano_front_url ||
    x?.front_image ||
    null;

  const currency = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n.toLocaleString();
  };

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  const fetchListings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("public/listings/");
      setListings(safeArr(res.data));
    } catch (e) {
      setError(axiosErr(e, "Could not load listings. Check backend endpoint."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthed && role === "tenant") fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, role]);

  const openListingDetails = (item) => {
    const id = getId(item);
    if (!id) {
      setToast({ type: "error", msg: "This listing has no id. Fix list API response." });
      return;
    }
    nav(`/public/listings/${id}`);
  };

  const openContactModal = (item) => {
    const id = getId(item);
    if (!id) {
      setToast({ type: "error", msg: "Cannot contact owner: listing id missing." });
      return;
    }
    setSelected(item);
    setMsg("");
    setToast({ type: "info", msg: "" });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelected(null);
    setMsg("");
    setToast({ type: "info", msg: "" });
  };

  const sendMessage = async () => {
    const listingId = selected ? getId(selected) : null;

    if (!listingId) {
      setToast({ type: "error", msg: "Cannot send message: listing id missing." });
      return;
    }
    if (!msg.trim()) {
      setToast({ type: "error", msg: "Please write a message first." });
      return;
    }

    setSending(true);
    setToast({ type: "info", msg: "" });

    try {
      const res = await api.post("tenant/booking-requests/create/", {
        listing_id: listingId,
        first_message: msg.trim(),
      });

      const bookingId = res?.data?.id;

      setToast({
        type: "success",
        msg: bookingId
          ? `Sent ✅ Open inbox to view replies (Request #${bookingId}).`
          : "Sent ✅ Open inbox to view replies.",
      });

      setMsg("");
      setOpen(false);

      if (bookingId) nav(`/tenant/inbox?open=${bookingId}`);
      else nav(`/tenant/inbox`);
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to send message.") });
    } finally {
      setSending(false);
    }
  };

  // -------------------------
  // ✅ Notifications
  // -------------------------
  const getNotifId = (n, idx) => n?.id ?? n?.pk ?? `${idx}`;
  const isUnread = (n) =>
    n?.is_read === false || n?.read === false || n?.seen === false;

  const unreadCount = useMemo(() => (notifs || []).filter(isUnread).length, [notifs]);

  const loadNotifs = async () => {
    setNotifsLoading(true);
    setNotifsError("");
    try {
      const endpoints = ["notifications/", "notification/", "tenant/notifications/", "notifications/tenant/"];
      let data = null;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          data = res.data;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && data == null) {
        setNotifsError(axiosErr(lastErr, "Notifications API not found."));
        setNotifs([]);
      } else {
        setNotifs(safeArr(data));
      }
    } finally {
      setNotifsLoading(false);
    }
  };

  const markNotifRead = async (id) => {
    const endpoints = ["notifications/mark-read/", "notifications/read/", "notification/read/"];
    for (const ep of endpoints) {
      try {
        await api.post(ep, { id });
        setNotifs((prev) =>
          (prev || []).map((n) =>
            String(getNotifId(n)) === String(id)
              ? { ...n, is_read: true, read: true, seen: true }
              : n
          )
        );
        return;
      } catch {
        // try next
      }
    }
  };

  useEffect(() => {
    if (showNotifs) loadNotifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifs]);

  // -------------------------
  // ✅ Maintenance: tenant create + list
  // -------------------------
  const loadMyMaintenance = async () => {
    setMyMaintLoading(true);
    setMyMaintError("");
    try {
      const endpoints = ["maintenance/my/", "tenant/maintenance/", "maintenance/tenant/", "maintenance/requests/my/"];
      let data = null;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          data = res.data;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && data == null) {
        setMyMaintError(axiosErr(lastErr, "Maintenance API not found."));
        setMyMaint([]);
      } else {
        setMyMaint(safeArr(data));
      }
    } finally {
      setMyMaintLoading(false);
    }
  };

  const submitHelp = async () => {
    const listingId = helpListing ? getId(helpListing) : null;
    if (!listingId) {
      setToast({ type: "error", msg: "Please select a listing first." });
      return;
    }
    if (!helpMsg.trim()) {
      setToast({ type: "error", msg: "Please write your problem message." });
      return;
    }

    setHelpSending(true);
    try {
      const endpoints = ["maintenance/create/", "tenant/maintenance/create/", "maintenance/request/", "maintenance/requests/create/"];
      let ok = false;

      for (const ep of endpoints) {
        try {
          await api.post(ep, {
            listing: listingId,
            listing_id: listingId,
            category: helpType,
            issue_type: helpType,
            message: helpMsg.trim(),
            description: helpMsg.trim(),
          });
          ok = true;
          break;
        } catch {
          // try next
        }
      }

      if (!ok) {
        setToast({ type: "error", msg: "Help request failed. Check backend maintenance endpoint." });
        return;
      }

      setToast({ type: "success", msg: "Help request sent ✅ Owner will be notified." });
      setHelpMsg("");
      setShowHelp(false);
      loadMyMaintenance();
    } finally {
      setHelpSending(false);
    }
  };

  useEffect(() => {
    if (isAuthed && role === "tenant") loadMyMaintenance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, role]);

  const ownerName =
    selected?.owner_name || selected?.owner?.name || selected?.owner || "Owner";
  const ownerEmail = selected?.owner_email || selected?.owner?.email || "";
  const ownerPhone = selected?.owner_phone || selected?.owner?.phone || "";

  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome ${email || "Tenant"}.`}
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowNotifs((s) => !s)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            title="Notifications"
          >
            🔔 Notifications
            <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-purple-500/80 px-2 py-[2px] text-[11px] font-bold text-white">
              {notifsLoading ? "..." : unreadCount}
            </span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            🔧 Request Help
          </button>

          <button
            onClick={() => nav("/tenant/inbox")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            📩 My Inbox
          </button>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Logout
          </button>
        </div>
      }
    >
      {/* Notifications Panel */}
      {showNotifs && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-semibold text-white">🔔 Notifications</div>
            <div className="flex gap-2">
              <button
                onClick={loadNotifs}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowNotifs(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>

          {notifsError ? (
            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {notifsError}
            </div>
          ) : notifsLoading ? (
            <div className="mt-3 text-sm text-slate-300">Loading...</div>
          ) : (notifs?.length ?? 0) === 0 ? (
            <div className="mt-3 text-sm text-slate-300">No notifications.</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {(notifs || []).map((n, idx) => {
                const id = getNotifId(n, idx);
                const unread = isUnread(n);
                const title = n?.title || n?.type || "Notification";
                const body = n?.message || n?.body || n?.text || "";
                const created = n?.created_at || n?.created || n?.timestamp || "";
                return (
                  <div
                    key={id}
                    className={`rounded-xl border p-3 ${
                      unread ? "border-purple-500/25 bg-purple-500/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white line-clamp-1">{title}</div>
                        <div className="mt-1 text-sm text-slate-200/90 whitespace-pre-wrap">{body || "—"}</div>
                        <div className="mt-2 text-[11px] text-slate-400">{created ? new Date(created).toLocaleString() : ""}</div>
                      </div>
                      {unread ? (
                        <button
                          onClick={() => markNotifRead(id)}
                          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                        >
                          Read
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Read</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Help Request Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">🔧 Request Maintenance Help</div>
                <div className="mt-1 text-sm text-slate-300">
                  Select property + issue type + message. Owner will receive it.
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <select
                value={helpListing ? String(getId(helpListing)) : ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const found = (listings || []).find((x) => String(getId(x)) === String(id));
                  setHelpListing(found || null);
                }}
                className="appearance-none rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
              >
                <option value="">Select a listing</option>
                {(listings || []).map((x) => (
                  <option key={getId(x)} value={getId(x)}>
                    {getTitle(x)} - {getAddress(x)}
                  </option>
                ))}
              </select>

              <select
                value={helpType}
                onChange={(e) => setHelpType(e.target.value)}
                className="appearance-none rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
              >
                <option value="plumbing">Plumbing</option>
                <option value="electricity">Electricity</option>
                <option value="cleaning">Cleaning</option>
                <option value="wifi">Wi-Fi</option>
                <option value="other">Other</option>
              </select>

              <textarea
                value={helpMsg}
                onChange={(e) => setHelpMsg(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                placeholder="Describe the problem..."
              />

              <div className="flex gap-2">
                <button
                  onClick={submitHelp}
                  disabled={helpSending}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
                >
                  {helpSending ? "Sending..." : "Send Help Request"}
                </button>

                <button
                  onClick={loadMyMaintenance}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                >
                  Refresh My Requests
                </button>
              </div>

              {myMaintError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {myMaintError}
                </div>
              ) : myMaintLoading ? (
                <div className="text-sm text-slate-300">Loading your requests...</div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">My Maintenance Requests</div>
                  {(myMaint?.length ?? 0) === 0 ? (
                    <div className="mt-2 text-sm text-slate-300">No requests yet.</div>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      {myMaint.slice(0, 5).map((r, idx) => (
                        <div key={r?.id ?? r?.pk ?? idx} className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-sm text-white font-semibold">
                            {r?.listing_title || r?.listing?.title || "Property"}
                          </div>
                          <div className="mt-1 text-xs text-slate-300">
                            Status: {String(r?.status ?? r?.state ?? "pending")}
                          </div>
                          <div className="mt-2 text-sm text-slate-200/90 whitespace-pre-wrap">
                            {r?.message || r?.description || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main listing section (your existing code) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-300">
          Browse listings, view details, and contact owners.
        </div>

        <button
          onClick={fetchListings}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Refresh Listings
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="mb-3 text-sm font-semibold">Available Properties</div>

        {toast.msg && (
          <div
            className={`mb-3 rounded-xl border p-3 text-sm ${
              toast.type === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-200"
                : toast.type === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-200"
                : "border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {loading && <div className="text-sm text-slate-300">Loading…</div>}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="text-sm text-slate-300">No properties found.</div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => {
              const id = getId(item);
              const img = toImageSrc(getImage(item));

              return (
                <div
                  key={id ?? `${getTitle(item)}-${getAddress(item)}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <img
                    src={img}
                    alt="property"
                    className="h-36 w-full rounded-2xl object-cover border border-white/10 bg-black/30"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/no-image.png";
                    }}
                  />

                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm line-clamp-1">{getTitle(item)}</div>
                    <div className="text-xs text-slate-300">Rs {currency(getRent(item))}</div>
                  </div>

                  <div className="mt-2 text-xs text-slate-300 line-clamp-2">
                    {getAddress(item)}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openListingDetails(item)}
                      disabled={!id}
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs hover:bg-white/15 transition disabled:opacity-60"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => openContactModal(item)}
                      disabled={!id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition disabled:opacity-60"
                    >
                      Contact Owner
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Modal (your existing) */}
      {open && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{getTitle(selected)}</div>
                <div className="mt-1 text-sm text-slate-300">{getAddress(selected)}</div>
              </div>

              <button
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold">Owner</div>
                <div className="mt-1 text-slate-200">{ownerName}</div>
                <div className="mt-1 text-xs text-slate-300">{ownerEmail}</div>
                <div className="mt-1 text-xs text-slate-300">{ownerPhone}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold">Rent</div>
                <div className="mt-1 text-slate-200">Rs {currency(getRent(selected))}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Message Owner</div>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/20"
                placeholder="Hi, I’m interested in this property. Is it available to visit?"
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send & Open Inbox"}
                </button>

                <button
                  onClick={() => nav("/tenant/inbox")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                >
                  Go Inbox →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
