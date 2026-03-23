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

  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("tenant_dashboard_theme");
      return saved ? saved === "dark" : false; // default = light
    } catch {
      return false;
    }
  });

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
    try {
      localStorage.setItem(
        "tenant_dashboard_theme",
        darkMode ? "dark" : "light"
      );
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
      nav("/unauthorized", { replace: true });
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
        msg: has ? "Removed from favorites." : "Saved to favorites.",
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
          ? `Sent. Opening Inbox (Request #${bookingId})`
          : "Sent. Opening Inbox",
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

  const isDark = darkMode;

  const pageWrap = isDark
    ? "min-h-screen bg-slate-950 text-white"
    : "min-h-screen bg-white text-slate-900";

  const heroCard = isDark
    ? "rounded-[32px] border border-white/10 bg-slate-900 p-5 md:p-6 shadow-2xl"
    : "rounded-[32px] border border-slate-200 bg-white p-5 md:p-6 shadow-lg";

  const subText = isDark ? "text-slate-300" : "text-slate-600";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";

  const sectionCard = isDark
    ? "rounded-[32px] border border-white/10 bg-slate-900 p-5 md:p-6 shadow-xl"
    : "rounded-[32px] border border-slate-200 bg-white p-5 md:p-6 shadow-lg";

  const inputClass = isDark
    ? "w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/40"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400";

  const ghostBtn = isDark
    ? "rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50";

  const topBtn = (tone) => {
    const darkMap = {
      normal: "border-white/10 bg-slate-800 text-slate-100 hover:bg-slate-700",
      blue: "border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15",
      green: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
      pink: "border-pink-400/20 bg-pink-500/10 text-pink-100 hover:bg-pink-500/15",
      red: "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/15",
      purple: "border-purple-400/20 bg-purple-500/10 text-purple-100 hover:bg-purple-500/15",
    };

    const lightMap = {
      normal: "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
      blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
      green: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      pink: "border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100",
      red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
      purple: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
    };

    return `rounded-2xl border px-3 py-2 text-sm transition ${
      isDark ? darkMap[tone] : lightMap[tone]
    }`;
  };

  const toastClass =
    toast.type === "success"
      ? isDark
        ? "border-green-500/20 bg-green-500/10 text-green-200"
        : "border-green-200 bg-green-50 text-green-700"
      : toast.type === "error"
      ? isDark
        ? "border-red-500/20 bg-red-500/10 text-red-200"
        : "border-red-200 bg-red-50 text-red-700"
      : isDark
      ? "border-white/10 bg-slate-800 text-slate-200"
      : "border-slate-200 bg-slate-50 text-slate-700";

  const featureCard = (tone) => {
    const darkMap = {
      purple: "from-purple-500/15 to-indigo-500/10 border-purple-400/15",
      cyan: "from-cyan-500/15 to-emerald-500/10 border-cyan-400/15",
      amber: "from-amber-500/15 to-orange-500/10 border-amber-400/15",
      sky: "from-sky-500/15 to-cyan-500/10 border-sky-400/15",
      green: "from-emerald-500/15 to-lime-500/10 border-emerald-400/15",
      blue: "from-blue-500/15 to-indigo-500/10 border-blue-400/15",
      teal: "from-green-500/15 to-teal-500/10 border-green-400/15",
    };

    const lightMap = {
      purple: "from-purple-50 to-indigo-50 border-purple-200",
      cyan: "from-cyan-50 to-emerald-50 border-cyan-200",
      amber: "from-amber-50 to-orange-50 border-amber-200",
      sky: "from-sky-50 to-cyan-50 border-sky-200",
      green: "from-emerald-50 to-lime-50 border-emerald-200",
      blue: "from-blue-50 to-indigo-50 border-blue-200",
      teal: "from-green-50 to-teal-50 border-green-200",
    };

    return `rounded-[24px] border bg-gradient-to-br p-4 min-h-[150px] ${
      isDark ? darkMap[tone] : lightMap[tone]
    }`;
  };

  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome ${email || "Tenant"}. Explore homes, contact owners, and manage your booking activity.`}
      right={
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDarkMode((v) => !v)}
            className={topBtn("blue")}
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button onClick={() => nav("/tenant/inbox")} className={topBtn("normal")}>
            📩 Inbox
          </button>

          <button onClick={() => nav("/tenant/roommates")} className={topBtn("purple")}>
            👥 Roommates
          </button>

          <button onClick={() => nav("/tenant/booking-payments")} className={topBtn("blue")}>
            💳 My Payments
          </button>

          <button onClick={() => nav("/tenant/expenses")} className={topBtn("green")}>
            💰 Expenses
          </button>

          <button
            onClick={() =>
              setToast({ type: "info", msg: `Favorites saved: ${favorites.length}` })
            }
            className={topBtn("pink")}
          >
            ❤️ Favorites
          </button>

          <button onClick={handleLogout} className={topBtn("red")}>
            Logout
          </button>
        </div>
      }
    >
      <div className={pageWrap}>
        <div className="mx-auto max-w-7xl">
          <div className={heroCard}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-4 md:grid-cols-[1.6fr_0.7fr_auto_auto]">
                <div>
                  <label className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${mutedText}`}>
                    Search
                  </label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by title, location, or description..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${mutedText}`}>
                    Price
                  </label>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className={inputClass}
                  >
                    <option value="any">Any Price</option>
                    <option value="lt5000">Below 5,000</option>
                    <option value="5000_10000">5,000 – 10,000</option>
                    <option value="gt10000">Above 10,000</option>
                  </select>
                </div>

                <button onClick={() => nav("/map")} className={ghostBtn}>
                  🗺️ Map Search
                </button>

                <button
                  onClick={() => nav("/tenant/ai")}
                  className={
                    isDark
                      ? "rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-500/15"
                      : "rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                  }
                >
                  ✨ AI Search
                </button>
              </div>

              <button onClick={fetchListings} className={ghostBtn}>
                Refresh Listings
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <button
                onClick={() => nav("/tenant/ai")}
                className={`${featureCard("purple")} text-left transition hover:-translate-y-1`}
              >
                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  ✨ AI Search
                </div>
                <div className={`mt-2 text-sm leading-6 ${subText}`}>
                  Smarter property suggestions.
                </div>
              </button>

              <button
                onClick={() => nav("/tenant/roommates")}
                className={`${featureCard("cyan")} text-left transition hover:-translate-y-1`}
              >
                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  👥 Roommate Finder
                </div>
                <div className={`mt-2 text-sm leading-6 ${subText}`}>
                  Match by budget and lifestyle.
                </div>
              </button>

              <button
                onClick={() => nav("/tenant/inbox")}
                className={`${featureCard("amber")} text-left transition hover:-translate-y-1`}
              >
                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  📩 Inbox
                </div>
                <div className={`mt-2 text-sm leading-6 ${subText}`}>
                  Continue chats with owners.
                </div>
              </button>

              <button
                onClick={() => nav("/tenant/virtual-furniture")}
                className={`${featureCard("sky")} text-left transition hover:-translate-y-1`}
              >
                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  🛋️ Virtual Furniture
                </div>
                <div className={`mt-2 text-sm leading-6 ${subText}`}>
                  Preview room setup before booking.
                </div>
              </button>

              <button
                onClick={() => nav("/tools/budget-split")}
                className={`${featureCard("green")} text-left transition hover:-translate-y-1`}
              >
                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  🧮 Budget Split
                </div>
                <div className={`mt-2 text-sm leading-6 ${subText}`}>
                  Split rent and shared costs.
                </div>
              </button>

              <button
                onClick={() => nav("/tenant/expenses")}
                className={`${featureCard("teal")} text-left transition hover:-translate-y-1`}
              >
                <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  💰 Expense Tracker
                </div>
                <div className={`mt-2 text-sm leading-6 ${subText}`}>
                  Track daily and monthly spending.
                </div>
              </button>
            </div>
          </div>

          <div className={`mt-6 ${sectionCard}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Available Properties
                </div>
                <div className={`mt-1 text-sm ${mutedText}`}>
                  Browse suitable places and contact owners directly.
                </div>
              </div>

              <div
                className={`rounded-full px-4 py-2 text-xs ${
                  isDark
                    ? "border border-white/10 bg-slate-800 text-slate-300"
                    : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {totalFiltered} result{totalFiltered === 1 ? "" : "s"}
              </div>
            </div>

            {toast.msg && (
              <div className={`mb-4 rounded-2xl border p-4 text-sm ${toastClass}`}>
                {toast.msg}
              </div>
            )}

            {loading && (
              <div className={`rounded-2xl p-5 text-sm ${isDark ? "border border-white/10 bg-slate-800 text-slate-300" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>
                Loading listings…
              </div>
            )}

            {!loading && error && (
              <div className={`rounded-2xl p-4 text-sm ${isDark ? "border border-red-500/20 bg-red-500/10 text-red-200" : "border border-red-200 bg-red-50 text-red-700"}`}>
                {error}
              </div>
            )}

            {!loading && !error && filteredListings.length === 0 && (
              <div className={`rounded-2xl p-6 text-center text-sm ${isDark ? "border border-white/10 bg-slate-800 text-slate-300" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>
                No properties found. Try changing your search or price filter.
              </div>
            )}

            {!loading && !error && filteredListings.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredListings.map((item) => {
                  const id = getId(item);
                  const img = toImageSrc(getImage(item));
                  const rent = getRent(item);

                  return (
                    <div
                      key={id ?? `${getTitle(item)}-${getAddress(item)}`}
                      className={`overflow-hidden rounded-[28px] transition duration-300 hover:-translate-y-1 ${
                        isDark
                          ? "border border-white/10 bg-slate-900 hover:bg-slate-800 hover:shadow-2xl"
                          : "border border-slate-200 bg-white hover:shadow-xl"
                      }`}
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
                          className={`absolute right-3 top-3 rounded-full px-3 py-2 text-sm backdrop-blur transition disabled:opacity-60 ${
                            isDark
                              ? "border border-white/10 bg-black/45 text-white hover:bg-black/60"
                              : "border border-slate-200 bg-white/90 text-slate-800 hover:bg-white"
                          }`}
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
                        <div className={`line-clamp-1 text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {getTitle(item)}
                        </div>

                        <div className={`mt-2 line-clamp-1 text-sm ${subText}`}>
                          📍 {getAddress(item)}
                        </div>

                        <div className={`mt-3 min-h-[48px] line-clamp-2 text-sm leading-6 ${mutedText}`}>
                          {getDescription(item)}
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => openListingDetails(item)}
                            disabled={!id}
                            className={
                              isDark
                                ? "rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                                : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                            }
                          >
                            View Details
                          </button>

                          <button
                            onClick={() => openContactModal(item)}
                            disabled={!id}
                            className={
                              isDark
                                ? "rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/15 disabled:opacity-60"
                                : "rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-60"
                            }
                          >
                            Chat Owner
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => nav(`/map?listing=${id}`)}
                            disabled={!id}
                            className={ghostBtn + " disabled:opacity-60"}
                          >
                            🗺️ Map
                          </button>

                          <button
                            onClick={() => nav(`/tenant/book/${id}`)}
                            disabled={!id}
                            className={
                              isDark
                                ? "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60"
                                : "rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                            }
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
                className={`w-full max-w-3xl overflow-hidden rounded-[32px] shadow-2xl ${
                  isDark
                    ? "border border-white/10 bg-slate-950"
                    : "border border-slate-200 bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`p-5 ${
                    isDark
                      ? "border-b border-white/10 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-cyan-500/10"
                      : "border-b border-slate-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-cyan-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {getTitle(selected)}
                      </div>
                      <div className={`mt-1 text-sm ${subText}`}>
                        📍 {getAddress(selected)}
                      </div>
                    </div>

                    <button onClick={closeModal} className={ghostBtn}>
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">
                  <div className={sectionCard}>
                    <div className={`text-sm font-semibold ${subText}`}>Owner Information</div>
                    <div className={`mt-3 text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{ownerName}</div>
                    <div className={`mt-2 text-sm ${subText}`}>
                      {ownerEmail || "No email available"}
                    </div>
                    <div className={`mt-1 text-sm ${subText}`}>
                      {ownerPhone || "No phone available"}
                    </div>
                  </div>

                  <div className={sectionCard}>
                    <div className={`text-sm font-semibold ${subText}`}>Rent</div>
                    <div className={`mt-3 text-2xl font-black ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                      Rs {currency(getRent(selected))}
                    </div>
                    <div className={`mt-2 text-sm ${mutedText}`}>
                      You can message the owner first or go directly to booking.
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className={sectionCard}>
                    <div className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Message Owner
                    </div>
                    <div className={`mt-1 text-sm ${mutedText}`}>
                      Introduce yourself and ask about availability, visit time, or move-in details.
                    </div>

                    <textarea
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      rows={5}
                      className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm outline-none transition ${
                        isDark
                          ? "border border-white/10 bg-slate-800 text-white focus:border-purple-400/40"
                          : "border border-slate-200 bg-slate-50 text-slate-900 focus:border-purple-400"
                      }`}
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
                        className={
                          isDark
                            ? "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                            : "rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        }
                      >
                        📅 Book This Property
                      </button>

                      <button onClick={() => nav("/tenant/inbox")} className={ghostBtn}>
                        Go Inbox
                      </button>
                    </div>
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