import React, { useEffect, useState } from "react";
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

  const getId = (item) =>
    item?.id ?? item?.pk ?? item?.listing_id ?? item?.property_id;

  const getTitle = (x) => x?.title || x?.property_name || x?.name || "Property";
  const getAddress = (x) =>
    x?.address || x?.location || x?.city || x?.area || "—";
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

  /**
   * ✅ IMPORTANT CHANGE
   * 1) Create a booking request thread
   * 2) Then go to Tenant Inbox and open the thread so tenant can see owner replies
   */
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
      // ✅ Create booking request (server should also store first message)
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

      // ✅ go to inbox (and open this chat if bookingId exists)
      if (bookingId) nav(`/tenant/inbox?open=${bookingId}`);
      else nav(`/tenant/inbox`);
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to send message.") });
    } finally {
      setSending(false);
    }
  };

  const ownerName =
    selected?.owner_name || selected?.owner?.name || selected?.owner || "Owner";
  const ownerEmail = selected?.owner_email || selected?.owner?.email || "";
  const ownerPhone = selected?.owner_phone || selected?.owner?.phone || "";

  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome ${email || "Tenant"}.`}
      right={
        <div className="flex gap-2">
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
                    <div className="font-semibold text-sm line-clamp-1">
                      {getTitle(item)}
                    </div>
                    <div className="text-xs text-slate-300">
                      Rs {currency(getRent(item))}
                    </div>
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

      {/* Contact Modal */}
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
                <div className="mt-1 text-sm text-slate-300">
                  {getAddress(selected)}
                </div>
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
                <div className="mt-1 text-slate-200">
                  Rs {currency(getRent(selected))}
                </div>
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
