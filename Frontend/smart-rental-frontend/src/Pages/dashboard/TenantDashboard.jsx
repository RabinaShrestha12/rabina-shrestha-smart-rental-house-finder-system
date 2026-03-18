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
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

export default function TenantDashboard() {
  const { role, email, logout, isAuthed } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [q, setQ] = useState("");
  const [priceFilter, setPriceFilter] = useState("any");

  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem("tenant_favorites");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("tenant_favorites", JSON.stringify(favorites));
  }, [favorites]);

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
  const getAddress = (x) => x?.address || x?.location || x?.city || x?.area || "—";
  const getRent = (x) => x?.rent ?? x?.price ?? x?.monthly_rent ?? null;
  const getType = (x) => x?.property_type || x?.type || "Property";
  const getDescription = (x) =>
    x?.description || x?.details || x?.about || "No description available.";

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

  const filteredListings = useMemo(() => {
    const query = q.trim().toLowerCase();

    const priceOk = (rent) => {
      const n = Number(rent);
      if (Number.isNaN(n)) return true;
      if (priceFilter === "any") return true;
      if (priceFilter === "lt5000") return n < 5000;
      if (priceFilter === "5000_10000") return n >= 5000 && n <= 10000;
      if (priceFilter === "gt10000") return n > 10000;
      return true;
    };

    return listings.filter((x) => {
      const t = (getTitle(x) || "").toLowerCase();
      const a = (getAddress(x) || "").toLowerCase();
      const d = (getDescription(x) || "").toLowerCase();
      const rent = getRent(x);

      const matchQuery =
        !query || t.includes(query) || a.includes(query) || d.includes(query);

      return matchQuery && priceOk(rent);
    });
  }, [listings, q, priceFilter]);

  const totalFiltered = filteredListings.length;

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

  const toggleFavorite = (item) => {
    const id = getId(item);
    if (!id) return;

    setFavorites((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      setToast({
        type: "success",
        msg: has ? "Removed from favorites." : "Saved to favorites ✅",
      });
      return next;
    });
  };

  const isFav = (item) => {
    const id = getId(item);
    return id ? favorites.includes(id) : false;
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
          ? `Sent ✅ Opening Inbox (Request #${bookingId})`
          : "Sent ✅ Opening Inbox",
      });

      setMsg("");
      setOpen(false);

      if (bookingId) nav(`/tenant/inbox?open=${bookingId}`);
      else nav("/tenant/inbox");
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

  const toastClass =
    toast.type === "success"
      ? "border-green-500/20 bg-green-500/10 text-green-200"
      : toast.type === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : "border-white/10 bg-white/5 text-slate-200";

  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome ${email || "Tenant"}. Explore homes, contact owners, and manage your booking activity.`}
      right={
        <div className="ml-auto flex flex-nowrap items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => nav("/tenant/inbox")}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            📩 Inbox
          </button>

          <button
            onClick={() => nav("/tenant/roommates")}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            👥 Roommates
          </button>

          <button
            onClick={() => nav("/tenant/booking-payments")}
            className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-500/15"
          >
            💳 My Payments
          </button>

          <button
            onClick={() => nav("/tenant/expenses")}
            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/15"
          >
            💰 Expenses
          </button>

          <button
            onClick={() =>
              setToast({ type: "info", msg: `Favorites saved: ${favorites.length}` })
            }
            className="rounded-2xl border border-pink-400/20 bg-pink-500/10 px-3 py-2 text-sm text-pink-100 transition hover:bg-pink-500/15"
          >
            ❤️ Favorites
          </button>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/15"
          >
            Logout
          </button>
        </div>
      }
    >
      <div className="rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-[1.6fr_0.7fr_auto_auto]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title, location, or description..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Price
              </label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/40"
              >
                <option value="any">Any Price</option>
                <option value="lt5000">Below 5,000</option>
                <option value="5000_10000">5,000 – 10,000</option>
                <option value="gt10000">Above 10,000</option>
              </select>
            </div>

            <button
              onClick={() => nav("/map")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              🗺️ Map Search
            </button>

            <button
              onClick={() => nav("/tenant/ai")}
              className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-500/15"
            >
              ✨ AI Search
            </button>
          </div>

          <button
            onClick={fetchListings}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Refresh Listings
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-5">
            <div className="text-lg font-bold text-white">✨ AI Search</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Find listings with smarter location and budget suggestions.
            </div>
            <button
              onClick={() => nav("/tenant/ai")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Open AI Search →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 p-5">
            <div className="text-lg font-bold text-white">👥 Roommate Finder</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Match with tenants who fit your budget and lifestyle.
            </div>
            <button
              onClick={() => nav("/tenant/roommates")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Find Matches →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-5">
            <div className="text-lg font-bold text-white">📩 Inbox</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Continue conversations with owners and track requests.
            </div>
            <button
              onClick={() => nav("/tenant/inbox")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Open Inbox →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-cyan-500/10 p-5">
            <div className="text-lg font-bold text-white">🛋️ Virtual Furniture</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Place and preview furniture virtually inside the room before booking.
            </div>
            <button
              onClick={() => nav("/tenant/virtual-furniture")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Open Virtual Furniture →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-lime-500/10 p-5">
            <div className="text-lg font-bold text-white">🧮 Budget Split</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Calculate and split rent, bills, and other shared monthly costs.
            </div>
            <button
              onClick={() => nav("/tools/budget-split")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Open Budget Split →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-5">
            <div className="text-lg font-bold text-white">💳 My Rent Payments</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              See how much rent you paid, which month, to which owner, and payment status.
            </div>
            <button
              onClick={() => nav("/tenant/booking-payments")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Open Payment History →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-green-500/10 to-teal-500/10 p-5">
            <div className="text-lg font-bold text-white">💰 Expense Tracker</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Store daily expenses and check monthly spending on food, travel, clothes, and more.
            </div>
            <button
              onClick={() => nav("/tenant/expenses")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Open Expense Tracker →
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-bold text-white">Available Properties</div>
            <div className="mt-1 text-sm text-slate-400">
              Browse suitable places and contact owners directly.
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            {totalFiltered} result{totalFiltered === 1 ? "" : "s"}
          </div>
        </div>

        {toast.msg && (
          <div className={`mb-4 rounded-2xl border p-4 text-sm ${toastClass}`}>
            {toast.msg}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            Loading listings…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && filteredListings.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
            No properties found. Try changing your search or price filter.
          </div>
        )}

        {!loading && !error && filteredListings.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => {
              const id = getId(item);
              const img = toImageSrc(getImage(item));
              const rent = getRent(item);

              return (
                <div
                  key={id ?? `${getTitle(item)}-${getAddress(item)}`}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07] hover:shadow-2xl"
                >
                  <div className="relative">
                    <img
                      src={img}
                      alt="property"
                      className="h-60 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/no-image.png";
                      }}
                    />

                    <button
                      onClick={() => toggleFavorite(item)}
                      disabled={!id}
                      className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-sm text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-60"
                    >
                      {isFav(item) ? "❤️" : "🤍"}
                    </button>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                          {getType(item)}
                        </span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-100 backdrop-blur">
                          Rs {currency(rent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="line-clamp-1 text-2xl font-bold text-white">
                      {getTitle(item)}
                    </div>

                    <div className="mt-3 line-clamp-1 text-sm text-slate-300">
                      📍 {getAddress(item)}
                    </div>

                    <div className="mt-4 min-h-[52px] line-clamp-2 text-sm leading-6 text-slate-400">
                      {getDescription(item)}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => openListingDetails(item)}
                        disabled={!id}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => openContactModal(item)}
                        disabled={!id}
                        className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/15 disabled:opacity-60"
                      >
                        💬 Chat Owner
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => nav(`/map?listing=${id}`)}
                        disabled={!id}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
                      >
                        🗺️ Map
                      </button>

                      <button
                        onClick={() => nav(`/tenant/book/${id}`)}
                        disabled={!id}
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60"
                      >
                        📅 Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-cyan-500/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-white">
                    {getTitle(selected)}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    📍 {getAddress(selected)}
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-slate-300">
                  Owner Information
                </div>
                <div className="mt-3 text-lg font-bold text-white">{ownerName}</div>
                <div className="mt-2 text-sm text-slate-300">
                  {ownerEmail || "No email available"}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {ownerPhone || "No phone available"}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-slate-300">Rent</div>
                <div className="mt-3 text-2xl font-black text-emerald-200">
                  Rs {currency(getRent(selected))}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  You can message the owner first or go directly to booking.
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-base font-bold text-white">Message Owner</div>
                <div className="mt-1 text-sm text-slate-400">
                  Introduce yourself and ask about availability, visit time, or
                  move-in details.
                </div>

                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={5}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/40"
                  placeholder="Hi, I’m interested in this property. Is it available to visit?"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={sendMessage}
                    disabled={sending}
                    className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Send & Open Inbox"}
                  </button>

                  <button
                    onClick={() => {
                      const id = getId(selected);
                      if (id) nav(`/tenant/book/${id}`);
                    }}
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                  >
                    📅 Book This Property
                  </button>

                  <button
                    onClick={() => nav("/tenant/inbox")}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    Go Inbox
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}