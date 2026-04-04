import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../components/ThemeContext";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  MapPin,
  Home,
  DollarSign,
  Calendar,
  Eye,
  RefreshCw,
  Layers,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const BACKEND =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const toImageSrc = (value) => {
  if (!value) {
    return "https://images.unsplash.com/photo-1560518884-ce5882228a49?auto=format&fit=crop&q=80&w=800";
  }
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
};

export default function OwnerMyProperties() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/owner/my-listings/");
      setRows(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) {
      setRows([]);
      setToast({ type: "error", msg: "Failed to load your properties." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doDelete = async (id) => {
    const ok = window.confirm(
      "Are you sure you want to permanently delete this property?"
    );
    if (!ok) return;

    try {
      await api.delete(`/owner/my-listings/${id}/delete/`);
      setRows((prev) => prev.filter((x) => x.id !== id));
      setToast({ type: "success", msg: "Property deleted successfully." });
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.detail || "Failed to delete property.",
      });
    }
  };

  return (
    <Shell
      title="Property Portfolio"
      subtitle="Manage your active listings, track performance, and update details."
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/owner/listings/create")}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
              isDark
                ? "bg-[#0b1220] text-white hover:bg-[#111c30] border border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.35)]"
                : "bg-neutral-900 text-white hover:bg-black shadow-lg shadow-neutral-900/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            New Listing
          </button>

          <button
            onClick={load}
            title="Refresh Portfolio"
            className={`p-2.5 rounded-xl transition-all ${
              isDark
                ? "bg-[#e8edf5] text-slate-700 hover:bg-white border border-slate-200"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <Toast
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`rounded-[32px] p-8 flex items-center gap-6 border transition-all ${
              isDark
                ? "bg-[#143861] border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                : "bg-white border-neutral-100 shadow-sm"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDark
                  ? "bg-blue-500/15 text-blue-300"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <Layers className="w-7 h-7" />
            </div>

            <div>
              <div
                className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                  isDark ? "text-slate-400" : "text-neutral-400"
                }`}
              >
                Total Properties
              </div>
              <div
                className={`text-3xl font-black leading-none ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                {loading ? "-" : rows.length}
              </div>
            </div>
          </div>

          <div
            className={`rounded-[32px] p-8 flex items-center gap-6 border transition-all ${
              isDark
                ? "bg-[#143861] border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                : "bg-white border-neutral-100 shadow-sm"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDark
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <div
                className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                  isDark ? "text-slate-400" : "text-neutral-400"
                }`}
              >
                Active Listings
              </div>
              <div
                className={`text-3xl font-black leading-none ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                {loading ? "-" : rows.filter((r) => r.is_active !== false).length}
              </div>
            </div>
          </div>

          <div
            onClick={() => nav("/owner")}
            className={`rounded-[32px] p-8 flex items-center justify-between group cursor-pointer border transition-all ${
              isDark
                ? "bg-[#143861] border-white/10 hover:border-blue-400/30 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                : "bg-white border-neutral-100 shadow-sm hover:border-blue-100"
            }`}
          >
            <div>
              <div
                className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                  isDark ? "text-slate-400" : "text-neutral-400"
                }`}
              >
                Portfolio Overview
              </div>

              <div
                className={`text-sm font-black flex items-center gap-2 ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Back to Dashboard
                <ChevronRight
                  className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                    isDark
                      ? "text-slate-400 group-hover:text-blue-300"
                      : "text-neutral-400 group-hover:text-blue-600"
                  }`}
                />
              </div>
            </div>

            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${
                isDark
                  ? "border-white/10 bg-[#1a4678] group-hover:bg-[#20538d]"
                  : "border-neutral-100 group-hover:bg-blue-50"
              }`}
            >
              <Home
                className={`w-5 h-5 ${
                  isDark
                    ? "text-slate-200 group-hover:text-blue-200"
                    : "text-neutral-400 group-hover:text-blue-600"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Portfolio Section */}
        <div
          className={`rounded-[40px] p-8 border transition-all ${
            isDark
              ? "bg-[#0d2748] border-white/10"
              : "bg-neutral-50/70 border-neutral-100"
          }`}
        >
          <div className="flex items-center justify-between mb-8 px-2">
            <h2
              className={`text-xl font-black tracking-tight ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              Active Portfolio
            </h2>

            <div
              className={`text-sm font-medium ${
                isDark ? "text-slate-400" : "text-neutral-500"
              }`}
            >
              {rows.length} items
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-80 rounded-[32px] animate-pulse border ${
                    isDark
                      ? "bg-[#143861] border-white/10"
                      : "bg-white border-neutral-100"
                  }`}
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div
              className={`h-64 rounded-[32px] border border-dashed flex flex-col items-center justify-center text-center p-8 ${
                isDark
                  ? "bg-[#143861] border-white/15"
                  : "bg-white border-neutral-200"
              }`}
            >
              <Home
                className={`w-12 h-12 mb-4 ${
                  isDark ? "text-slate-500" : "text-neutral-200"
                }`}
              />
              <h3
                className={`text-lg font-black uppercase tracking-widest ${
                  isDark ? "text-slate-300" : "text-neutral-400"
                }`}
              >
                No Properties Listed
              </h3>
              <p
                className={`text-sm font-medium mt-2 max-w-sm ${
                  isDark ? "text-slate-400" : "text-neutral-500"
                }`}
              >
                Tap the "New Listing" button above to publish your first property
                to the marketplace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rows.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-[32px] overflow-hidden border group flex flex-col transition-all duration-300 ${
                    isDark
                      ? "bg-[#143861] border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:border-blue-400/25"
                      : "bg-white border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-neutral-200/40"
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={toImageSrc(p.image || p.cover_image)}
                      alt="Property Cover"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    <div className="absolute top-4 left-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                          p.is_active !== false
                            ? isDark
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/20"
                              : "bg-white text-emerald-600"
                            : isDark
                            ? "bg-[#1a4678] text-slate-200 border border-white/10"
                            : "bg-white text-neutral-400"
                        }`}
                      >
                        {p.is_active !== false ? "● Active" : "○ Draft"}
                      </span>
                    </div>

                    <div
                      className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 backdrop-blur-md border ${
                        isDark
                          ? "bg-[#153862]/90 text-white border-white/10"
                          : "bg-white/90 text-neutral-900"
                      }`}
                    >
                      <Eye
                        className={`w-3.5 h-3.5 ${
                          isDark ? "text-blue-300" : "text-blue-600"
                        }`}
                      />
                      {p.views || 0}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        className={`text-lg font-black leading-tight mb-2 line-clamp-1 ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {p.title || "Untitled Property"}
                      </h3>

                      <div
                        className={`flex items-center gap-1.5 text-xs font-bold mb-4 ${
                          isDark ? "text-slate-400" : "text-neutral-400"
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">
                          {p.location || "Location not specified"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div
                          className={`rounded-2xl p-3 border ${
                            isDark
                              ? "bg-[#1a4678] border-white/10"
                              : "bg-neutral-50 border-neutral-100"
                          }`}
                        >
                          <div
                            className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${
                              isDark ? "text-slate-300" : "text-neutral-400"
                            }`}
                          >
                            <DollarSign className="w-3 h-3" />
                            Rent
                          </div>
                          <div
                            className={`text-sm font-black ${
                              isDark ? "text-white" : "text-neutral-900"
                            }`}
                          >
                            Rs {p.price_per_month || "0"}
                          </div>
                        </div>

                        <div
                          className={`rounded-2xl p-3 border ${
                            isDark
                              ? "bg-[#1a4678] border-white/10"
                              : "bg-neutral-50 border-neutral-100"
                          }`}
                        >
                          <div
                            className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${
                              isDark ? "text-slate-300" : "text-neutral-400"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            Added
                          </div>
                          <div
                            className={`text-sm font-black ${
                              isDark ? "text-white" : "text-neutral-900"
                            }`}
                          >
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "Recently"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => nav(`/public/listings/${p.id}`)}
                        title="View Public Listing"
                        className={`py-3 rounded-xl flex items-center justify-center transition-colors border ${
                          isDark
                            ? "bg-[#1a4678] text-slate-100 hover:bg-[#20538d] border-white/10"
                            : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border-transparent"
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => nav(`/owner/listing/${p.id}/edit`)}
                        className={`py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                          isDark
                            ? "bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 border-blue-400/20"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-transparent"
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      <button
                        onClick={() => doDelete(p.id)}
                        title="Delete Property"
                        className={`py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center transition-all border ${
                          isDark
                            ? "bg-red-500/15 text-red-200 hover:bg-red-500/25 border-red-400/20"
                            : "bg-red-50 text-red-600 hover:bg-red-100 border-transparent"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}