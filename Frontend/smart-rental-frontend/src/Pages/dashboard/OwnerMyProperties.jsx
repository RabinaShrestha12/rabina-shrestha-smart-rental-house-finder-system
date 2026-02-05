import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

const BACKEND = "http://127.0.0.1:8000";
const toImageSrc = (value) => {
  if (!value) return "/no-image.png";
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
};

export default function OwnerMyProperties() {
  const nav = useNavigate();
  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/owner/my-listings/");
      setRows(Array.isArray(res.data) ? res.data : (res.data?.results || []));
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
    const ok = window.confirm("Are you sure you want to delete this property?");
    if (!ok) return;

    try {
      await api.delete(`/owner/my-listings/${id}/delete/`);
      setRows((prev) => prev.filter((x) => x.id !== id));
      setToast({ type: "success", msg: "Deleted successfully." });
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.detail || "Delete failed.",
      });
    }
  };

  return (
    <Shell
      title="My Property Details"
      subtitle="These are properties you posted."
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => nav("/owner")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Back
          </button>

          <button
            onClick={load}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Refresh
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
        <p className="text-slate-300">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-300">No properties yet.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <img
                src={toImageSrc(p.image || p.cover_image)}
                alt="cover"
                className="w-full h-40 object-cover rounded-2xl"
              />

              <div className="mt-2 text-white font-semibold">{p.title || "Untitled"}</div>
              <div className="text-sm text-slate-300">{p.location || "-"}</div>
              <div className="text-sm text-slate-200 mt-1">
                <b>{p.price_per_month ? `$${p.price_per_month}` : "-"}</b> / month
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => nav(`/owner/listing/${p.id}`)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                >
                  View
                </button>

                <button
                  onClick={() => nav(`/owner/listing/${p.id}/edit`)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                >
                  Edit
                </button>

                <button
                  onClick={() => doDelete(p.id)}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100 hover:bg-red-500/20 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
