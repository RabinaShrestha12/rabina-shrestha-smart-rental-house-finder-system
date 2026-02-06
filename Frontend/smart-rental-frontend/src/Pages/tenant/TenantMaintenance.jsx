// src/pages/tenant/TenantMaintenance.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

export default function TenantMaintenance() {
  const [items, setItems] = useState([]);
  const [listings, setListings] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);

  const [msg, setMsg] = useState({ type: "info", text: "" });

  // form
  const [form, setForm] = useState({
    listing_id: "",
    category: "plumbing",
    priority: "medium",
    title: "",
    description: "",
  });

  const safeArr = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const axiosMsg = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  const listingTitle = (x) => x?.title || x?.name || x?.property_name || "Property";
  const listingId = (x) => x?.id ?? x?.pk ?? x?.listing_id ?? x?.property_id;

  // Load tenant visible listings (public/listings is fine; or you can load tenant bookings list)
  async function loadListings() {
    setLoadingList(true);
    try {
      const res = await api.get("public/listings/");
      const arr = safeArr(res.data);

      setListings(arr);
      // If only one listing, auto-select it
      if (!form.listing_id && arr.length === 1 && listingId(arr[0])) {
        setForm((p) => ({ ...p, listing_id: String(listingId(arr[0])) }));
      }
    } catch (e) {
      setMsg({ type: "error", text: axiosMsg(e, "Failed to load listings.") });
      setListings([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadRequests() {
    setLoadingItems(true);
    try {
      const res = await api.get("tenant/maintenance/");
      setItems(safeArr(res.data));
    } catch (e) {
      setMsg({ type: "error", text: axiosMsg(e, "Failed to load maintenance requests.") });
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => {
    loadListings();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    return (
      String(form.listing_id || "").trim() &&
      String(form.title || "").trim() &&
      String(form.description || "").trim()
    );
  }, [form]);

  async function submit(e) {
    e.preventDefault();
    setMsg({ type: "info", text: "" });

    if (!canSubmit) {
      setMsg({ type: "error", text: "Please select listing, title and description." });
      return;
    }

    try {
      await api.post("tenant/maintenance/create/", {
        listing_id: Number(form.listing_id),
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        description: form.description.trim(),
      });

      setForm({
        listing_id: form.listing_id, // keep selected
        category: "plumbing",
        priority: "medium",
        title: "",
        description: "",
      });

      setMsg({ type: "success", text: "✅ Request submitted! Owner will receive it." });
      loadRequests();
    } catch (e) {
      setMsg({ type: "error", text: axiosMsg(e, "Failed to submit request.") });
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              🛠️ Maintenance / Emergency Requests
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Select a property and send a help request (plumbing, electrical, WiFi, cleaning, etc).
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadRequests}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
            >
              Refresh My Requests
            </button>
            <button
              onClick={loadListings}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
            >
              Refresh Listings
            </button>
          </div>
        </div>

        {msg.text && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              msg.type === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-200"
                : msg.type === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-200"
                : "border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* CREATE FORM */}
        <form onSubmit={submit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label={`Select Listing ${loadingList ? "(loading...)" : ""}`}
            value={form.listing_id}
            onChange={(v) => setForm((p) => ({ ...p, listing_id: v }))}
            options={[
              ["", "Select a listing"],
              ...listings
                .map((x) => [String(listingId(x) || ""), `${listingTitle(x)} (ID: ${listingId(x)})`])
                .filter(([id]) => !!id),
            ]}
          />

          <Select
            label="Issue Type"
            value={form.category}
            onChange={(v) => setForm((p) => ({ ...p, category: v }))}
            options={[
              ["plumbing", "Plumbing"],
              ["electrical", "Electrical"],
              ["cleaning", "Cleaning"],
              ["internet", "Internet/WiFi"],
              ["other", "Other"],
            ]}
          />

          <Select
            label="Priority"
            value={form.priority}
            onChange={(v) => setForm((p) => ({ ...p, priority: v }))}
            options={[
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["emergency", "Emergency"],
            ]}
          />

          <Field
            label="Title"
            value={form.title}
            onChange={(v) => setForm((p) => ({ ...p, title: v }))}
            placeholder="Example: Bathroom tap leaking"
          />

          <TextArea
            label="Description"
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            className="md:col-span-2"
            placeholder="Describe the problem in detail..."
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="md:col-span-2 rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-500 transition disabled:opacity-60"
          >
            Send Help Request
          </button>
        </form>

        {/* LIST */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white mb-2">My Requests</h2>

          {loadingItems ? (
            <div className="text-sm text-slate-300">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-300">No requests yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((x) => (
                <div
                  key={x.id ?? `${x.title}-${x.created_at}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="text-white font-semibold">
                      #{x.id} — {x.title || "Untitled"}
                    </div>
                    <div className="text-xs text-slate-300">
                      {String(x.status || "pending")} | {String(x.priority || "medium")} |{" "}
                      {String(x.category || "other")}
                    </div>
                  </div>

                  <div className="text-sm mt-2 text-slate-200/90 whitespace-pre-wrap">
                    {x.description || x.message || "—"}
                  </div>

                  <div className="text-xs mt-2 text-slate-400">
                    Created: {x.created_at ? new Date(x.created_at).toLocaleString() : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold mb-1 text-slate-200">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/20"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, className = "", placeholder = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-sm font-semibold mb-1 text-slate-200">{label}</div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/20"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold mb-1 text-slate-200">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/20"
      >
        {options.map(([v, t]) => (
          <option key={`${v}-${t}`} value={v} className="bg-slate-900 text-white">
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
