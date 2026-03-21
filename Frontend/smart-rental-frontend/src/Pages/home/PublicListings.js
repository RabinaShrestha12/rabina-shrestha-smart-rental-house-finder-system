import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

function weekToMonth(weekly) {
  const n = Number(weekly);
  if (Number.isNaN(n) || n <= 0) return null;
  return n * 4.345;
}

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function PublicListings() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [qTitle, setQTitle] = useState("");
  const [qLocation, setQLocation] = useState("");
  const [qType, setQType] = useState("all");

  const isDark = darkMode;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/public/listings/");
        setListings(res.data || []);
      } catch (e) {
        console.error(e);
        alert("Failed to load listings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = qTitle.trim().toLowerCase();
    const loc = qLocation.trim().toLowerCase();

    return (listings || []).filter((l) => {
      const titleOk = !t || (l.title || "").toLowerCase().includes(t);
      const locOk = !loc || (l.location || "").toLowerCase().includes(loc);
      const typeOk = qType === "all" || (l.property_type || "") === qType;
      return titleOk && locOk && typeOk;
    });
  }, [listings, qTitle, qLocation, qType]);

  const reset = () => {
    setQTitle("");
    setQLocation("");
    setQType("all");
  };

  const go360 = (listingId) => navigate(`/listing/${listingId}/360`);
  const goDetails = (listingId) => navigate(`/listings/${listingId}`);

  const goBook = (listingId, booked) => {
    if (booked) return;

    const token = localStorage.getItem("access");
    const role = localStorage.getItem("role");

    if (!token) {
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listingId}`);
      navigate("/auth");
      return;
    }

    if (role !== "tenant") {
      alert("Please login as Tenant to book a property.");
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listingId}`);
      navigate("/auth");
      return;
    }

    navigate(`/tenant/book/${listingId}`);
  };

  const pageBg = isDark
    ? "min-h-screen bg-[radial-gradient(circle_at_top_left,_#08224a_0%,_#071738_28%,_#04112b_58%,_#020816_100%)] text-white"
    : "min-h-screen bg-[#f4f7fc] text-slate-900";

  const navBg = isDark
    ? "border-b border-white/10 bg-[#03081c]/90"
    : "border-b border-blue-100 bg-white/95";

  const heading = isDark ? "text-white" : "text-[#1a2f6b]";
  const sub = isDark ? "text-slate-300" : "text-slate-600";
  const softText = isDark ? "text-slate-400" : "text-slate-500";

  const cardClass = isDark
    ? "border border-white/10 bg-white/5"
    : "border border-blue-100 bg-white";

  const inputClass = isDark
    ? "border-white/10 bg-slate-900/70 text-white placeholder:text-slate-400"
    : "border-blue-100 bg-slate-50 text-slate-900 placeholder:text-slate-400";

  const linkBase =
    "rounded-full px-5 py-2 text-sm font-semibold transition duration-200";

  if (loading) {
    return (
      <div className={pageBg}>
        <div className="mx-auto max-w-7xl px-6 py-10">Loading...</div>
      </div>
    );
  }

  return (
    <div className={pageBg}>
      {/* Navbar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${navBg}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
              SRHFS
            </div>

            <div>
              <h1 className={`text-xl font-extrabold ${heading}`}>
                Smart Rental House Finder
              </h1>
              <p className={`text-xs ${sub}`}>Modern Rental Platform</p>
            </div>
          </div>

          <nav className="hidden items-center gap-3 md:flex">
            <Link
              to="/"
              className={`${linkBase} ${
                isDark
                  ? "bg-white/5 text-white hover:bg-blue-600"
                  : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              Home
            </Link>

            <Link
              to="/features"
              className={`${linkBase} ${
                isDark
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-blue-100 text-blue-950 shadow"
              }`}
            >
              Features
            </Link>

            <Link
              to="/about"
              className={`${linkBase} ${
                isDark
                  ? "bg-white/5 text-white hover:bg-blue-600"
                  : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              About
            </Link>

            <Link
              to="/auth"
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
            >
              Login
            </Link>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isDark
                  ? "bg-white text-slate-900 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-blue-950"
              }`}
            >
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
          </nav>
        </div>
      </header>

      {/* Search Box */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className={`rounded-[28px] p-6 shadow-2xl ${cardClass}`}>
          <div className="mb-6">
            <h2 className={`text-3xl font-extrabold ${heading}`}>
              Browse Available Properties
            </h2>
            <p className={`mt-2 ${sub}`}>
              Search owner-added rooms, apartments, and houses
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              placeholder="Search title"
              className={`rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
            />

            <input
              value={qLocation}
              onChange={(e) => setQLocation(e.target.value)}
              placeholder="Location"
              className={`rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
            />

            <select
              value={qType}
              onChange={(e) => setQType(e.target.value)}
              className={`rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
            >
              <option value="all">All</option>
              <option value="room">Room</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
            </select>

            <button
              onClick={() => {}}
              title="Filtering happens automatically as you type"
              className="rounded-2xl border border-blue-200 bg-white px-6 py-3 font-semibold text-[#1a2f6b]"
            >
              Search
            </button>

            <button
              onClick={reset}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 font-semibold text-white"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={`text-3xl font-extrabold ${heading}`}>
              Available Listings
            </h3>
            <p className={`mt-2 ${sub}`}>Showing real properties from the system</p>
          </div>

          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              isDark
                ? "border border-white/10 bg-white/5 text-white"
                : "border border-blue-100 bg-white text-slate-700"
            }`}
          >
            {filtered.length} found
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={`rounded-3xl p-10 text-center ${cardClass}`}>
            <p className={sub}>No listings found.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => {
              const cover = toImageSrc(l.image_url || l.image || l.pano_front_url);
              const booked = l.is_available === false || l.status === "booked";

              const monthPriceRaw =
                l.price_per_month ??
                (l.price_per_week ? weekToMonth(l.price_per_week) : null);

              const monthPriceText =
                monthPriceRaw == null ? "-" : money(monthPriceRaw);

              return (
                <div
                  key={l.id}
                  className={`overflow-hidden rounded-[28px] shadow-xl transition hover:-translate-y-1 ${cardClass}`}
                >
                  <div className="relative">
                    <img
                      src={cover}
                      alt={l.title || "Property"}
                      className="h-56 w-full object-cover"
                      onError={(e) => (e.currentTarget.src = "/no-image.png")}
                    />

                    <button
                      onClick={() => go360(l.id)}
                      className="absolute bottom-4 right-4 rounded-full bg-black/70 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-black/80"
                    >
                      View 360°
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-xl font-bold ${heading}`}>
                        {l.title || "About Property"}
                      </h3>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                        {l.property_type || "Property"}
                      </span>
                    </div>

                    <p className={`mt-2 text-sm ${softText}`}>
                      {l.location || "-"}
                    </p>

                    <div className={`mt-4 text-sm leading-7 ${sub}`}>
                      <div>
                        <span className="font-semibold">Type:</span>{" "}
                        {l.property_type || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Location:</span>{" "}
                        {l.location || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Price:</span> $
                        {monthPriceText}/month
                      </div>
                    </div>

                    {l.description ? (
                      <p className={`mt-4 line-clamp-3 text-sm leading-7 ${sub}`}>
                        {l.description}
                      </p>
                    ) : null}

                    {booked ? (
                      <div className="mt-4 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                        Booked
                      </div>
                    ) : null}

                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <button
                        onClick={() => goDetails(l.id)}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-3 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02]"
                      >
                        Details
                      </button>

                      <button
                        onClick={() => go360(l.id)}
                        className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                          isDark
                            ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                            : "border border-blue-100 bg-slate-100 text-slate-800 hover:bg-slate-200"
                        }`}
                      >
                        360°
                      </button>

                      <button
                        onClick={() => goBook(l.id, booked)}
                        disabled={booked}
                        className={`rounded-2xl px-3 py-3 text-sm font-semibold text-white transition ${
                          booked
                            ? "cursor-not-allowed bg-slate-400"
                            : "bg-emerald-600 hover:bg-emerald-500"
                        }`}
                      >
                        {booked ? "Booked" : "Booking"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}