import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import ListingMapPanel from "../../components/ListingMapPanel";
import { useTheme } from "../../components/ThemeContext";
import {
  ArrowLeft,
  Home,
  MapPin,
  Phone,
  Mail,
  Zap,
  Wallet,
  Building2,
  Maximize2,
  X,
  ImageIcon,
} from "lucide-react";

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

export default function OwnerListingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`owner/my-listings/${id}/`);
        const data = res.data?.data || res.data;
        setRow(data);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load property detail.";
        setToast({ type: "error", msg });
        setRow(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const wrapperClass = isDark
    ? "rounded-[32px] border border-blue-400/15 bg-gradient-to-br from-[#0f2947] via-[#12345c] to-[#0b223d] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
    : "rounded-[32px] border border-blue-100 bg-gradient-to-br from-white via-[#f8fbff] to-[#eef6ff] p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)]";

  const softCard = isDark
    ? "rounded-2xl border border-blue-300/10 bg-[#0b2038] shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white shadow-sm";

  const statCard = isDark
    ? "rounded-2xl border border-blue-300/10 bg-[#102a47] p-4"
    : "rounded-2xl border border-blue-100 bg-[#f8fbff] p-4";

  const headingText = isDark ? "text-white" : "text-slate-900";
  const subText = isDark ? "text-blue-100/80" : "text-slate-500";
  const normalText = isDark ? "text-slate-200" : "text-slate-700";
  const mutedText = isDark ? "text-slate-300" : "text-slate-600";

  return (
    <Shell
      title="My Property Detail"
      subtitle={`Listing ID: ${id}`}
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-[#12345c] text-blue-100 hover:bg-[#163d6d]"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => nav("/owner")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      {loading ? (
        <div
          className={`rounded-3xl p-8 text-sm font-medium ${
            isDark ? "bg-[#10243d] text-slate-300" : "bg-white text-slate-600"
          }`}
        >
          Loading...
        </div>
      ) : !row ? (
        <div
          className={`rounded-3xl p-8 text-sm font-medium ${
            isDark ? "bg-[#10243d] text-slate-300" : "bg-white text-slate-600"
          }`}
        >
          No data found.
        </div>
      ) : (
        <div className={wrapperClass}>
          <div className={softCard}>
            <img
              src={toImageSrc(row.image || row.cover_image || row.image_url)}
              alt="cover"
              className="h-[260px] w-full rounded-2xl object-cover md:h-[340px] xl:h-[380px]"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/no-image.png";
              }}
            />
          </div>

          <div className="mt-5">
            <h2 className={`text-2xl font-black tracking-tight md:text-3xl ${headingText}`}>
              {row.title || "Untitled"}
            </h2>

            <div className={`mt-2 flex flex-wrap items-center gap-2 text-sm ${subText}`}>
              <MapPin className="h-4 w-4 text-blue-500" />
              <span>{row.location || "-"}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={statCard}>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${subText}`}>
                  Property Type
                </span>
              </div>
              <p className={`text-base font-bold capitalize ${normalText}`}>
                {row.property_type || "-"}
              </p>
            </div>

            <div className={statCard}>
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${subText}`}>
                  Price Per Month
                </span>
              </div>
              <p className={`text-base font-bold ${normalText}`}>
                {row.price_per_month != null ? `Rs ${row.price_per_month}` : "-"}
              </p>
            </div>

            <div className={statCard}>
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${subText}`}>
                  Electricity Bill
                </span>
              </div>
              <p className={`text-base font-bold ${normalText}`}>
                {row.electricity_bill || "-"}
              </p>
            </div>

            <div className={statCard}>
              <div className="mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${subText}`}>
                  Contact Number
                </span>
              </div>
              <p className={`text-base font-bold ${normalText}`}>
                {row.owner_contact_number || "-"}
              </p>
            </div>

            <div className={statCard}>
              <div className="mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-pink-500" />
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${subText}`}>
                  Contact Email
                </span>
              </div>
              <p className={`break-all text-base font-bold ${normalText}`}>
                {row.owner_contact_email || "-"}
              </p>
            </div>

            <div className={statCard}>
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-500" />
                <span className={`text-xs font-bold uppercase tracking-[0.18em] ${subText}`}>
                  Coordinates
                </span>
              </div>
              <p className={`text-base font-bold ${normalText}`}>
                {row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : "-"}
              </p>
            </div>
          </div>

          <div className={`mt-6 ${softCard} p-5`}>
            <h3 className={`text-lg font-black ${headingText}`}>Description</h3>
            <div className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${mutedText}`}>
              {row.description || "-"}
            </div>
          </div>

          <div className="mt-6">
            <h3 className={`text-lg font-black ${headingText}`}>360 Photos</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                "pano_front",
                "pano_back",
                "pano_left",
                "pano_right",
                "pano_up",
                "pano_down",
              ].map((k) => (
                <div key={k} className={`${softCard} p-3`}>
                  <div
                    className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${
                      isDark ? "text-blue-200/80" : "text-slate-500"
                    }`}
                  >
                    {k.replace("pano_", "").toUpperCase()}
                  </div>

                  <img
                    src={toImageSrc(row[k])}
                    alt={k}
                    className="h-40 w-full rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/no-image.png";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className={`flex items-center gap-3 text-xl font-black ${headingText}`}>
              <ImageIcon className="h-6 w-6 text-blue-500" />
              Space & Room Gallery
            </h3>
            
            {row.gallery_images && row.gallery_images.length > 0 ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {row.gallery_images.map((img, idx) => (
                  <div 
                    key={img.id || idx} 
                    className={`${softCard} group relative cursor-pointer overflow-hidden transition-all duration-500 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10`}
                    onClick={() => setSelectedImg(toImageSrc(img.image_url || img.image))}
                  >
                    <div className="absolute inset-0 z-10 hidden items-center justify-center bg-blue-600/20 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:flex group-hover:opacity-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-xl">
                        <Maximize2 className="h-6 w-6" />
                      </div>
                    </div>
                    
                    <img
                      src={toImageSrc(img.image_url || img.image)}
                      alt={`Space ${idx + 1}`}
                      className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/no-image.png";
                      }}
                    />
                    <div className="absolute bottom-4 left-4 z-20">
                      <div className="rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/10">
                        Space #{idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`mt-6 rounded-[32px] border-2 border-dashed p-12 text-center transition-colors ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                <ImageIcon className={`mx-auto h-12 w-12 mb-4 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                <p className={`text-sm font-bold uppercase tracking-widest ${mutedText}`}>No extra space images uploaded</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className={`${softCard} p-4 overflow-hidden`}>
              <h3 className={`mb-6 flex items-center gap-3 text-lg font-black ${headingText}`}>
                <MapPin className="h-5 w-5 text-red-500" />
                Physical Location
              </h3>
              <div className="h-[350px] overflow-hidden rounded-[24px]">
                <ListingMapPanel listing={row} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImg && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedImg(null)}
        >
          <button 
            className="absolute right-8 top-8 z-[10000] flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-110 active:scale-95 border border-white/10"
            onClick={() => setSelectedImg(null)}
          >
            <X className="h-8 w-8" />
          </button>
          
          <div 
            className="relative max-h-[90vh] max-w-[95vw] overflow-hidden rounded-[40px] shadow-2xl shadow-blue-500/20 border border-white/10 animate-in zoom-in-95 duration-500"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={selectedImg} 
              alt="Fullscreen Preview" 
              className="max-h-[90vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </Shell>
  );
}