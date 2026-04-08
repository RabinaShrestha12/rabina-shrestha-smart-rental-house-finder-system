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

          <div className="mt-6">
            <div className={`${softCard} p-4`}>
              <h3 className={`mb-4 text-lg font-black ${headingText}`}>Location Map</h3>
              <ListingMapPanel listing={row} />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}