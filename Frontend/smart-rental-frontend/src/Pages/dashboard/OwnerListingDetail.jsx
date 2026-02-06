// src/pages/dashboard/OwnerListingDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import ListingMapPanel from "../../components/ListingMapPanel";

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

export default function OwnerListingDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // ✅ If your axios baseURL already ends with /api/,
        // then DO NOT start with "/" otherwise it becomes wrong URL.
        // Use one of these depending on your axios config:
        // 1) api.get(`owner/my-listings/${id}/`)
        // 2) api.get(`/owner/my-listings/${id}/`)
        //
        // I am using the safer one (no leading slash):
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

  return (
    <Shell
      title="My Property Detail"
      subtitle={`Listing ID: ${id}`}
      right={
        <button
          onClick={() => nav("/owner")}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Back
        </button>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      {loading ? (
        <p className="text-slate-300">Loading...</p>
      ) : !row ? (
        <p className="text-slate-300">No data found.</p>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          {/* Cover */}
          <img
            src={toImageSrc(row.image || row.cover_image || row.image_url)}
            alt="cover"
            className="w-full max-h-[360px] object-cover rounded-2xl border border-white/10"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/no-image.png";
            }}
          />

          {/* Title */}
          <h2 className="mt-4 text-xl font-semibold text-white">
            {row.title || "Untitled"}
          </h2>
          <p className="mt-1 text-slate-200">{row.location || "-"}</p>

          {/* Basic info */}
          <div className="mt-4 grid md:grid-cols-2 gap-3 text-slate-200 text-sm">
            <div>
              <b>Type:</b> {row.property_type || "-"}
            </div>

            <div>
              <b>Price/month:</b>{" "}
              {row.price_per_month != null ? `$${row.price_per_month}` : "-"}
            </div>

            <div>
              <b>Electricity:</b> {row.electricity_bill || "-"}
            </div>

            <div>
              <b>Contact:</b> {row.owner_contact_number || "-"}
            </div>

            <div>
              <b>Email:</b> {row.owner_contact_email || "-"}
            </div>

            {/* ✅ show coords if exists */}
            <div>
              <b>Coordinates:</b>{" "}
              {row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : "-"}
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 text-slate-200 text-sm">
            <b>Description:</b>
            <div className="mt-1 text-slate-300 whitespace-pre-wrap">
              {row.description || "-"}
            </div>
          </div>

          {/* 360 Photos */}
          <div className="mt-6">
            <h3 className="text-white font-semibold">360 Photos</h3>

            <div className="mt-3 grid md:grid-cols-3 gap-3">
              {[
                "pano_front",
                "pano_back",
                "pano_left",
                "pano_right",
                "pano_up",
                "pano_down",
              ].map((k) => (
                <div
                  key={k}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-xs text-slate-300 mb-2">
                    {k.replace("pano_", "").toUpperCase()}
                  </div>
                  <img
                    src={toImageSrc(row[k])}
                    alt={k}
                    className="w-full h-32 object-cover rounded-xl border border-white/10"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/no-image.png";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ✅ MAP + Nearby Services */}
          <div className="mt-6">
            <ListingMapPanel listing={row} />
          </div>
        </div>
      )}
    </Shell>
  );
}
