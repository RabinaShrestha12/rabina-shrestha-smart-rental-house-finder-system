// src/pages/home/PublicListingDetails.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import ListingMapPanel from "../../components/ListingMapPanel";
import ReviewsBox from "../../components/ReviewsBox";
import { ChevronLeft, Building, MapPin, DollarSign, Plug, Phone, Mail, Star, Calendar } from "lucide-react";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800";
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

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("access");
  const role = localStorage.getItem("role"); 

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  useEffect(() => {
    (async () => {
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
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 pt-32 pb-24 text-neutral-900 w-full flex justify-center items-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        <div className="text-neutral-500 font-medium">Loading property details...</div>
      </div>
    </div>
  );

  if (err) return (
    <div className="min-h-screen bg-neutral-50 pt-32 pb-24 px-6">
      <div className="max-w-3xl mx-auto bg-red-50 text-red-700 p-8 rounded-3xl border border-red-200 flex flex-col items-center text-center">
        <h3 className="text-2xl font-bold mb-4">Could not load property</h3>
        <p className="mb-8">{err}</p>
        <div className="flex gap-4">
          <button onClick={() => nav(-1)} className="px-6 py-3 rounded-full bg-white border border-red-300 font-bold hover:bg-red-50 transition">← Go Back</button>
          <button onClick={() => nav("/listings")} className="px-6 py-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition">Browse Listings</button>
        </div>
      </div>
    </div>
  );

  if (!listing) return <div className="min-h-screen bg-neutral-50 pt-32 pb-24 px-6 flex justify-center items-center font-medium text-neutral-500">Not found.</div>;

  const cover = toImageSrc(listing.image_url || listing.image || listing.pano_front_url);
  const price = listing.price_per_month != null
      ? { value: listing.price_per_month, label: "/mo" }
      : listing.price_per_week != null
      ? { value: listing.price_per_week, label: "/wk" }
      : listing.rent != null
      ? { value: listing.rent, label: "/mo" }
      : { value: "—", label: "" };

  const has360 = listing.pano_front_url && listing.pano_back_url && listing.pano_left_url && listing.pano_right_url && listing.pano_up_url && listing.pano_down_url;

  return (
    <div className="min-h-screen bg-neutral-50 pt-32 pb-24 text-neutral-900 selection:bg-blue-600 selection:text-white">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-blue-600 transition-colors bg-white px-5 py-2.5 rounded-full border border-neutral-200 shadow-sm hover:shadow">
            <ChevronLeft className="w-4 h-4" /> Back to listings
          </button>

          <div className="flex gap-3">
            {has360 && (
              <button onClick={() => nav(`/listing/${listing.id}/360`)} className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 px-5 py-2.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                <Star className="w-4 h-4" /> View 360° Virtual Tour
              </button>
            )}
            
            <button
              onClick={() => {
                if (!token) return nav("/auth");
                if (role !== "tenant") return nav("/unauthorized");
                nav(`/tenant/book/${listing.id}`);
              }}
              disabled={!token || role !== "tenant"}
              className={`flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm ${
                !token || role !== "tenant" 
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-300" 
                : "bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 shadow-blue-500/30 hover:shadow-lg"
              }`}
            >
              <Calendar className="w-4 h-4" /> 
              {!token ? "Login to Book" : role !== "tenant" ? "Tenant Only" : "Request Booking"}
            </button>
          </div>
        </div>

        {/* Main Details Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-neutral-900/5 border border-neutral-100 mb-12 flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2 w-full h-[300px] md:h-[400px] rounded-[24px] overflow-hidden relative border border-neutral-100 shadow-inner">
            <img src={cover} alt="Property Cover" className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4">
              <span className="bg-white/95 backdrop-blur text-blue-700 font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-widest shadow-sm">
                {listing.property_type || "Rental"}
              </span>
            </div>
            <div className="absolute bottom-4 left-4">
              <span className="bg-neutral-900/80 backdrop-blur text-white font-extrabold px-5 py-2 rounded-xl text-lg shadow-lg border border-neutral-700/50">
                ${price.value}<span className="text-sm font-medium text-neutral-300">{price.label}</span>
              </span>
            </div>
          </div>

          <div className="lg:w-1/2 w-full flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight mb-4">
              {listing.title || "Premium Property"}
            </h1>
            
            <div className="flex items-center gap-2 text-neutral-500 font-medium mb-8">
              <MapPin className="w-5 h-5 text-blue-500" /> {listing.location || listing.address || "Location not specified"}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Building className="w-5 h-5"/></div>
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Type</div>
                  <div className="font-semibold text-neutral-900">{listing.property_type || "—"}</div>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><DollarSign className="w-5 h-5"/></div>
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Rent</div>
                  <div className="font-semibold text-neutral-900">${price.value}{price.label}</div>
                </div>
              </div>
              {listing.electricity_bill && (
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Plug className="w-5 h-5"/></div>
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Electricity</div>
                    <div className="font-semibold text-neutral-900">{listing.electricity_bill}</div>
                  </div>
                </div>
              )}
              {listing.owner_contact_number && (
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Phone className="w-5 h-5"/></div>
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Owner Contact</div>
                    <div className="font-semibold text-neutral-900">{listing.owner_contact_number}</div>
                  </div>
                </div>
              )}
              {listing.owner_contact_email && (
                <div className="col-span-2 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><Mail className="w-5 h-5"/></div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Owner Email</div>
                    <div className="font-semibold text-neutral-900 truncate">{listing.owner_contact_email}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border text-sm leading-relaxed text-neutral-600 border-neutral-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Description</h3>
              <p>{listing.description || "No description provided for this property."}</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-neutral-900/5 border border-neutral-100 mb-12">
           <ReviewsBox listingId={id} canReview={role === "tenant"} />
        </div>

        {/* 360 Images Box */}
        {has360 && (
          <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-neutral-900/5 border border-neutral-100 mb-12">
            <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-6">360° Photo Gallery</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                ["Front View", listing.pano_front_url],
                ["Back View", listing.pano_back_url],
                ["Left View", listing.pano_left_url],
                ["Right View", listing.pano_right_url],
                ["Top View", listing.pano_up_url],
                ["Floor View", listing.pano_down_url],
              ].map(([label, url]) => (
                <div key={label} className="group overflow-hidden rounded-2xl border border-neutral-200 relative">
                  <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-md">
                    {label}
                  </div>
                  <img src={toImageSrc(url)} alt={label} className="w-full h-32 md:h-48 object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = "/no-image.png"; }} />
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <button onClick={() => nav(`/listing/${listing.id}/360`)} className="px-8 py-3 rounded-full bg-neutral-900 text-white font-bold hover:bg-neutral-800 transition-colors shadow-lg">
                Enter Full 360° Experience
              </button>
            </div>
          </div>
        )}

        {/* Map Panel Layering */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-neutral-900/5 border border-neutral-100 overflow-hidden">
          <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-6">Location Map & Nearby</h3>
          <div className="w-full rounded-2xl overflow-hidden border border-neutral-200">
            <ListingMapPanel listing={listing} />
          </div>
        </div>

      </div>
    </div>
  );
}
