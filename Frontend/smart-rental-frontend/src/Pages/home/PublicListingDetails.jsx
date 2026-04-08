import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import ListingMapPanel from "../../components/ListingMapPanel";
import ReviewsBox from "../../components/ReviewsBox";
import { useTheme } from "../../components/ThemeContext";
import {
  ChevronLeft,
  Building,
  MapPin,
  Banknote,
  Plug,
  Phone,
  Star,
  Calendar,
} from "lucide-react";

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

export default function PublicListingDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  const role = (localStorage.getItem("role") || "").toLowerCase();

  const ui = {
    bg: isDark ? "bg-[#071120]" : "bg-neutral-50",
    card: isDark
      ? "bg-[#0f2947] border border-white/10"
      : "bg-white border border-neutral-100 shadow-xl shadow-neutral-900/5",
    innerCard: isDark
      ? "bg-[#10233f] border border-white/5"
      : "bg-neutral-50 border border-neutral-100",
    text: isDark ? "text-white" : "text-neutral-900",
    subText: isDark ? "text-slate-400" : "text-neutral-500",
    mutedText: isDark ? "text-slate-500" : "text-neutral-400",
    btnSecondary: isDark
      ? "bg-[#12345c] text-white border-white/10 hover:bg-[#163d6d]"
      : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50",
    divider: isDark ? "border-white/5" : "border-neutral-100",
  };

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  useEffect(() => {
    const loadListing = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`public/listings/${id}/`);
        const data = res.data?.data || res.data?.results?.[0] || res.data;

        if (!data || typeof data !== "object") {
          throw new Error("Invalid listing detail response.");
        }

        setListing(data);
      } catch (e) {
        setErr(axiosErr(e, `Failed to load property details for id=${id}.`));
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [id]);

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-24 w-full flex justify-center items-center ${ui.bg}`}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full border-4 ${
              isDark ? "border-blue-900/50 border-t-blue-500" : "border-blue-200 border-t-blue-600"
            } animate-spin`}
          />
          <div className={`${ui.subText} font-medium`}>Loading property details...</div>
        </div>
      </div>
    );
  }

  if (err || !listing) {
    return (
      <div className={`min-h-screen pt-32 pb-24 px-6 ${ui.bg}`}>
        <div
          className={`max-w-3xl mx-auto p-8 rounded-3xl flex flex-col items-center text-center ${
            isDark
              ? "bg-red-500/10 border border-red-500/20 text-red-200"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <h3 className="text-2xl font-bold mb-4">
            {err ? "Could not load property" : "Property not found"}
          </h3>
          <p className="mb-8">{err || "The requested listing does not exist."}</p>
          <div className="flex gap-4">
            <button
              onClick={() => nav(-1)}
              className={`px-6 py-3 rounded-full font-bold transition ${ui.btnSecondary}`}
            >
              ← Go Back
            </button>
            <button
              onClick={() => nav("/listings")}
              className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
            >
              Browse Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cover = toImageSrc(listing.image_url || listing.image || listing.pano_front_url);

  const price =
    listing.price_per_month != null
      ? { value: listing.price_per_month, label: "/mo" }
      : listing.price_per_week != null
      ? { value: listing.price_per_week, label: "/wk" }
      : listing.rent != null
      ? { value: listing.rent, label: "/mo" }
      : { value: "—", label: "" };

  const has360 =
    listing.pano_front_url &&
    listing.pano_back_url &&
    listing.pano_left_url &&
    listing.pano_right_url &&
    listing.pano_up_url &&
    listing.pano_down_url;

  const isBooked =
    listing.is_available === false ||
    String(listing.status || "").toLowerCase() === "booked";

  const handleBook = () => {
    if (isBooked) return;

    if (!token) {
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listing.id}`);
      nav("/auth");
      return;
    }

    if (role !== "tenant") {
      nav("/unauthorized");
      return;
    }

    nav(`/tenant/book/${listing.id}`);
  };

  const bookingButtonText = isBooked
    ? "Booked"
    : !token
    ? "Login to Book"
    : role !== "tenant"
    ? "Tenant Only"
    : "Request Booking";

  const bookingButtonClass = isBooked
    ? "bg-red-400 text-white cursor-not-allowed border border-red-500"
    : !token || role !== "tenant"
    ? isDark
      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
      : "bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-300"
    : "bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 shadow-blue-500/30 hover:shadow-lg hover:-translate-y-0.5";

  return (
    <div className={`min-h-screen py-16 text-neutral-900 transition-colors duration-500 ${ui.bg}`}>
      <div className="max-w-6xl mx-auto px-6 md:px-12 mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button
            onClick={() => nav(-1)}
            className={`flex items-center gap-2 text-sm font-bold transition-all px-5 py-2.5 rounded-full shadow-sm hover:shadow-lg ${ui.btnSecondary}`}
          >
            <ChevronLeft className="w-4 h-4" /> Back to listings
          </button>

          <div className="flex gap-3 flex-wrap">
            {isBooked ? (
              <span
                className={`px-4 py-2.5 rounded-full text-sm font-bold ${
                  isDark
                    ? "bg-red-500/15 text-red-300 border border-red-500/20"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                Booked
              </span>
            ) : (
              <span
                className={`px-4 py-2.5 rounded-full text-sm font-bold ${
                  isDark
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                Available
              </span>
            )}

            {has360 && (
              <button
                onClick={() => nav(`/listing/${listing.id}/360`)}
                className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full border transition-all ${
                  isDark
                    ? "bg-[#3b82f6]/10 text-blue-400 border-blue-500/20 hover:bg-[#3b82f6]/20"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                }`}
              >
                <Star className="w-4 h-4" /> View 360° Virtual Tour
              </button>
            )}

            <button
              onClick={handleBook}
              disabled={isBooked || !token || role !== "tenant"}
              className={`flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm ${bookingButtonClass}`}
            >
              <Calendar className="w-4 h-4" />
              {bookingButtonText}
            </button>
          </div>
        </div>

        <div className={`rounded-[32px] p-6 mb-12 flex flex-col lg:flex-row gap-8 overflow-hidden ${ui.card}`}>
          <div className="lg:w-1/2 w-full h-[300px] md:h-[400px] rounded-[24px] overflow-hidden relative shadow-inner border border-white/5">
            <img src={cover} alt="Property Cover" className="w-full h-full object-cover" />

            <div className="absolute top-4 left-4 flex gap-2">
              <span
                className={`backdrop-blur font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] shadow-sm ${
                  isDark ? "bg-black/60 text-blue-400 border border-white/10" : "bg-white/95 text-blue-700"
                }`}
              >
                {listing.property_type || "Rental"}
              </span>

              {isBooked && (
                <span className="bg-red-500/90 backdrop-blur text-white font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] shadow-sm">
                  Booked
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4">
              <span className="bg-neutral-900/80 backdrop-blur text-white font-black px-5 py-2.5 rounded-2xl text-xl shadow-2xl border border-white/10">
                Rs {price.value}
                <span className="text-xs font-semibold text-white/60 ml-1">{price.label}</span>
              </span>
            </div>
          </div>

          <div className="lg:w-1/2 w-full flex flex-col justify-center py-4">
            <h1 className={`text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4 ${ui.text}`}>
              {listing.title || "Premium Property"}
            </h1>

            <div className={`flex items-center gap-2 font-semibold mb-8 ${ui.subText}`}>
              <MapPin className="w-5 h-5 text-blue-500" />
              {listing.location || listing.address || "Location not specified"}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className={`p-4 rounded-3xl flex items-center gap-3 transition-colors ${ui.innerCard}`}>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${ui.mutedText}`}>Type</div>
                  <div className={`font-bold ${ui.text}`}>{listing.property_type || "—"}</div>
                </div>
              </div>

              <div className={`p-4 rounded-3xl flex items-center gap-3 transition-colors ${ui.innerCard}`}>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-blue-400/10 text-blue-400" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${ui.mutedText}`}>Rent</div>
                  <div className={`font-bold ${ui.text}`}>Rs {price.value}</div>
                </div>
              </div>

              {listing.electricity_bill && (
                <div className={`p-4 rounded-3xl flex items-center gap-3 transition-colors ${ui.innerCard}`}>
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDark ? "bg-orange-500/10 text-orange-400" : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    <Plug className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${ui.mutedText}`}>
                      Electricity
                    </div>
                    <div className={`font-bold ${ui.text}`}>{listing.electricity_bill}</div>
                  </div>
                </div>
              )}

              {listing.owner_contact_number && (
                <div className={`p-4 rounded-3xl flex items-center gap-3 transition-colors ${ui.innerCard}`}>
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${ui.mutedText}`}>
                      Owner Info
                    </div>
                    <div className={`font-bold ${ui.text}`}>{listing.owner_contact_number}</div>
                  </div>
                </div>
              )}
            </div>

            <div className={`border rounded-3xl p-6 transition-colors ${ui.card} shadow-lg`}>
              <h3 className={`text-lg font-black mb-3 ${ui.text}`}>Description</h3>
              <p className={`text-sm leading-relaxed ${ui.subText}`}>
                {listing.description || "No description provided for this property."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className={`lg:col-span-2 rounded-[32px] p-8 shadow-sm ${ui.card}`}>
            <ReviewsBox listingId={id} canReview={role === "tenant"} />
          </div>

          <div className="flex flex-col gap-8">
            <div className={`rounded-[32px] p-6 h-full min-h-[300px] overflow-hidden ${ui.card}`}>
              <h3 className={`text-xl font-black mb-6 ${ui.text}`}>Location</h3>
              <div className="w-full h-[300px] rounded-[24px] overflow-hidden border border-white/5 grayscale-[0.3] hover:grayscale-0 transition-all duration-500">
                <ListingMapPanel listing={listing} />
              </div>
            </div>
          </div>
        </div>

        {has360 && (
          <div className={`rounded-[32px] p-8 mb-12 shadow-sm ${ui.card}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-2xl font-black tracking-tight ${ui.text}`}>360° Photo Gallery</h3>
              <button
                onClick={() => nav(`/listing/${listing.id}/360`)}
                className="text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 group"
              >
                Expand View
                <ChevronLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["Front View", listing.pano_front_url],
                ["Back View", listing.pano_back_url],
                ["Left View", listing.pano_left_url],
                ["Right View", listing.pano_right_url],
                ["Top View", listing.pano_up_url],
                ["Floor View", listing.pano_down_url],
              ].map(([label, url]) => (
                <div key={label} className={`group overflow-hidden rounded-2xl relative border ${ui.divider}`}>
                  <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-white/10">
                    {label}
                  </div>
                  <img
                    src={toImageSrc(url)}
                    alt={label}
                    className="w-full h-32 md:h-44 object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = "/no-image.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}