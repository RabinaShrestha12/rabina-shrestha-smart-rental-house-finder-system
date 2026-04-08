import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useTheme } from "../../components/ThemeContext";
import { Search, MapPin, Building, Filter, Star } from "lucide-react";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) {
    return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800";
  }
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

function safeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  return [];
}

export default function PublicListings() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const initialLocation = urlParams.get("location") || "";
  const initialType = urlParams.get("type") || "all";

  const [qTitle, setQTitle] = useState("");
  const [qLocation, setQLocation] = useState(initialLocation);
  const [qType, setQType] = useState(initialType);

  const isDark = theme === "dark";

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/public/listings/");
        const arr = safeArray(res.data);

        console.log("Public listings API response:", res.data);
        console.log("Normalized listings:", arr);

        setListings(arr);
      } catch (e) {
        console.error("Failed to fetch listings:", e);
        setError(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to load listings."
        );
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const filtered = useMemo(() => {
    const t = qTitle.trim().toLowerCase();
    const loc = qLocation.trim().toLowerCase();

    return (listings || []).filter((l) => {
      const titleOk = !t || String(l?.title || "").toLowerCase().includes(t);
      const locOk =
        !loc ||
        String(l?.location || l?.address || "")
          .toLowerCase()
          .includes(loc);
      const typeOk =
        qType === "all" ||
        String(l?.property_type || "").toLowerCase() === qType.toLowerCase();

      return titleOk && locOk && typeOk;
    });
  }, [listings, qTitle, qLocation, qType]);

  const reset = () => {
    setQTitle("");
    setQLocation("");
    setQType("all");
    navigate("/listings", { replace: true });
  };

  const go360 = (listingId) => navigate(`/listing/${listingId}/360`);
  const goDetails = (listingId) => navigate(`/listings/${listingId}`);

  const goBook = (listingId) => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    const role = (localStorage.getItem("role") || "").toLowerCase();

    if (!token) {
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listingId}`);
      navigate("/auth");
      return;
    }

    if (role && role !== "tenant") {
      alert("Please login as tenant to send a booking request for this property.");
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listingId}`);
      localStorage.removeItem("access");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      navigate("/auth");
      return;
    }

    navigate(`/tenant/book/${listingId}`);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen pt-32 pb-24 transition-colors duration-300"
        style={{
          background: "var(--bg-color)",
          color: "var(--text-color)",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`h-[430px] animate-pulse rounded-3xl ${
                  isDark ? "bg-[#10233f]" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen pt-32 pb-24 transition-colors duration-300"
        style={{
          background: "var(--bg-color)",
          color: "var(--text-color)",
        }}
      >
        <div className="mx-auto max-w-4xl px-6">
          <div
            className={`rounded-3xl p-8 ${
              isDark
                ? "border border-red-500/20 bg-red-500/10 text-red-200"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <h2 className="text-2xl font-bold">Could not load listings</h2>
            <p className="mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pt-32 pb-24 transition-colors duration-500 selection:bg-blue-600 selection:text-white premium-bg ${
        isDark ? "text-slate-100" : "text-neutral-900"
      }`}
    >
      <section className="mx-auto mb-12 max-w-[1500px] px-6">
        <div className="mb-8">
          <h1
            className={`mb-4 text-4xl font-extrabold tracking-tight md:text-5xl ${
              isDark ? "text-white" : "text-neutral-900"
            }`}
          >
            Search <span className="text-blue-600">Properties</span>
          </h1>
          <p
            className={`text-lg ${
              isDark ? "text-slate-300" : "text-neutral-500"
            }`}
          >
            Browse through our extensive catalogue of verified homes, apartments,
            and rooms.
          </p>
        </div>

        <div
          className={`flex flex-col gap-4 rounded-3xl p-6 shadow-xl xl:flex-row ${
            isDark
              ? "border border-white/10 bg-[#0b1b33] shadow-black/30"
              : "border border-neutral-100 bg-white shadow-neutral-900/5"
          }`}
        >
          <div
            className={`flex flex-1 items-center gap-3 rounded-2xl p-4 ${
              isDark
                ? "border border-white/10 bg-[#10233f]"
                : "border border-neutral-200 bg-neutral-50"
            }`}
          >
            <Search className="h-5 w-5 shrink-0 text-blue-500" />
            <input
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              placeholder="Search by title or keywords"
              className={`w-full border-none bg-transparent font-medium outline-none ${
                isDark
                  ? "text-white placeholder:text-slate-400"
                  : "text-neutral-900 placeholder:text-neutral-400"
              }`}
            />
          </div>

          <div
            className={`flex flex-1 items-center gap-3 rounded-2xl p-4 ${
              isDark
                ? "border border-white/10 bg-[#10233f]"
                : "border border-neutral-200 bg-neutral-50"
            }`}
          >
            <MapPin className="h-5 w-5 shrink-0 text-blue-500" />
            <input
              value={qLocation}
              onChange={(e) => setQLocation(e.target.value)}
              placeholder="City, neighborhood, or zip"
              className={`w-full border-none bg-transparent font-medium outline-none ${
                isDark
                  ? "text-white placeholder:text-slate-400"
                  : "text-neutral-900 placeholder:text-neutral-400"
              }`}
            />
          </div>

          <div
            className={`flex flex-1 items-center gap-3 rounded-2xl p-4 xl:max-w-xs ${
              isDark
                ? "border border-white/10 bg-[#10233f]"
                : "border border-neutral-200 bg-neutral-50"
            }`}
          >
            <Building className="h-5 w-5 shrink-0 text-blue-500" />
            <select
              value={qType}
              onChange={(e) => setQType(e.target.value)}
              className={`w-full cursor-pointer appearance-none border-none bg-transparent font-medium outline-none ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              <option value="all">All Property Types</option>
              <option value="room">Room</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>

          <button
            onClick={reset}
            className={`flex items-center justify-center gap-2 rounded-2xl px-8 py-4 font-bold text-white shadow-lg ${
              isDark
                ? "bg-blue-700 hover:bg-blue-600 shadow-blue-900/40"
                : "bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20"
            }`}
          >
            Clear Filters
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wider ${
              isDark
                ? "border border-blue-500/20 bg-blue-500/10 text-blue-300"
                : "border border-blue-100 bg-blue-50 text-blue-600"
            }`}
          >
            <Filter className="h-4 w-4" /> {filtered.length} Properties Found
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            className={`mt-8 rounded-[32px] p-16 text-center ${
              isDark
                ? "border border-white/10 bg-[#0b1b33]"
                : "border border-neutral-100 bg-white shadow-sm"
            }`}
          >
            <Search
              className={`mx-auto mb-4 h-16 w-16 ${
                isDark ? "text-slate-500" : "text-neutral-300"
              }`}
            />
            <h3
              className={`mb-2 text-2xl font-bold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              No properties found.
            </h3>
            <p className={isDark ? "text-slate-300" : "text-neutral-500"}>
              Try clearing filters or check the API response in browser console.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => {
              const cover = toImageSrc(l.image_url || l.image || l.pano_front_url);
              const booked =
                l.is_available === false ||
                String(l.status || "").toLowerCase() === "booked";

              const monthPriceRaw =
                l.price_per_month ??
                (l.price_per_week ? weekToMonth(l.price_per_week) : null);

              const monthPriceText =
                monthPriceRaw == null ? "-" : money(monthPriceRaw);

              return (
                <div
                  key={l.id}
                  className={`group flex min-h-[460px] flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isDark
                      ? "border border-white/10 bg-[#0b1b33] shadow-black/20"
                      : "border border-neutral-200 bg-white shadow-sm"
                  }`}
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={cover}
                      alt={l.title || "Property"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/no-image.png";
                      }}
                    />

                    <div className="absolute left-4 top-4 flex gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 backdrop-blur">
                        {l.property_type || "Rental"}
                      </span>

                      {booked && (
                        <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
                          Booked
                        </span>
                      )}
                    </div>

                    {l.pano_front_url && (
                      <button
                        onClick={() => go360(l.id)}
                        className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/80"
                      >
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" /> 360°
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div
                      className={`mb-3 flex items-center gap-1 text-sm ${
                        isDark ? "text-slate-300" : "text-neutral-500"
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-blue-500" />
                      {l.location || "Location not specified"}
                    </div>

                    <h3
                      className={`mb-2 line-clamp-1 text-2xl font-bold ${
                        isDark
                          ? "text-white group-hover:text-blue-400"
                          : "text-neutral-900 group-hover:text-blue-600"
                      }`}
                    >
                      {l.title || "About Property"}
                    </h3>

                    <p
                      className={`mb-6 line-clamp-2 flex-1 text-sm ${
                        isDark ? "text-slate-300" : "text-neutral-500"
                      }`}
                    >
                      {l.description ||
                        "A beautiful property available for rent. Contact us for more details."}
                    </p>

                    <div
                      className={`mb-6 flex items-center justify-between border-t pt-4 ${
                        isDark ? "border-white/10" : "border-neutral-100"
                      }`}
                    >
                      <div>
                        <span className="text-2xl font-extrabold text-blue-600">
                          Rs {monthPriceText === "-" ? "0" : monthPriceText}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isDark ? "text-slate-300" : "text-neutral-500"
                          }`}
                        >
                          {" "}
                          /mo
                        </span>
                      </div>

                      <div>
                        {booked ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              isDark
                                ? "bg-red-500/15 text-red-300 border border-red-500/20"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            Already booked
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              isDark
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            Available
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-3">
                      <button
                        onClick={() => goDetails(l.id)}
                        className={`rounded-xl py-3 font-bold ${
                          isDark
                            ? "border border-white/10 bg-[#10233f] text-white hover:border-blue-500/30 hover:bg-[#163055]"
                            : "border-2 border-neutral-100 bg-white text-neutral-900 hover:border-blue-100 hover:bg-blue-50"
                        }`}
                      >
                        Details
                      </button>

                      <button
                        onClick={() => goBook(l.id)}
                        className={`rounded-xl py-3 font-bold text-white shadow-lg ${
                          booked
                            ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
                        }`}
                      >
                        {booked ? "Send Request" : "Book Now"}
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