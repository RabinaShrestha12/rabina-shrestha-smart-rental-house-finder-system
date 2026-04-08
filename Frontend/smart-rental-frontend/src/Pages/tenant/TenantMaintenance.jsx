import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import Shell from "../../components/Shell";

export default function TenantMaintenance() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "info", text: "" });

  const [form, setForm] = useState({
    listing_id: "",
    category: "plumbing",
    priority: "medium",
    title: "",
    description: "",
  });

  const safeArr = (d) => (Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : []);

  const axiosMsg = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  async function load() {
    setLoading(true);
    setMsg({ type: "info", text: "" });
    try {
      const res = await api.get("tenant/maintenance/");
      setItems(safeArr(res.data));
    } catch (e) {
      setItems([]);
      setMsg({ type: "error", text: axiosMsg(e, "Failed to load maintenance requests.") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
      setMsg({ type: "error", text: "Please fill Listing ID, Title, and Description." });
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

      setForm((p) => ({
        ...p,
        title: "",
        description: "",
        category: "plumbing",
        priority: "medium",
      }));

      setMsg({ type: "success", text: "✅ Request submitted! Owner will receive it." });
      load();
    } catch (e) {
      setMsg({ type: "error", text: axiosMsg(e, "Failed to submit request.") });
    }
  }

  const badge = (st) => {
    const s = String(st || "").toLowerCase();
    if (s === "resolved") return "bg-green-500/15 text-green-200 border-green-500/20";
    if (s === "rejected") return "bg-red-500/15 text-red-200 border-red-500/20";
    if (s === "in_progress") return "bg-amber-500/15 text-amber-200 border-amber-500/20";
    return "bg-blue-500/15 text-blue-200 border-blue-500/20";
  };

  return (
    <Shell title="Maintenance / Emergency" subtitle="Request help (plumber, electrician, etc.)">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="text-xl font-bold text-white">Create Request</div>
              <div className="mt-1 text-sm text-slate-300">
                Create a request for plumbing, electrical, cleaning, internet, etc.
              </div>
            </div>

            <button
              onClick={load}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
            >
              Refresh
            </button>
          </div>

          {msg.text && (
            <div
              className={`mt-4 rounded-2xl border p-3 text-sm ${
                msg.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-200"
                  : msg.type === "error"
                  ? "border-red-500/20 bg-red-500/10 text-red-200"
                  : "border-white/10 bg-white/5 text-slate-100"
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="Listing ID (number)"
              value={form.listing_id}
              onChange={(v) => setForm((p) => ({ ...p, listing_id: v }))}
              placeholder="Example: 12"
            />

            <Select
              label="Category"
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
              placeholder="Describe the issue in detail..."
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="md:col-span-2 rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-500 transition disabled:opacity-60"
            >
              Submit Request
            </button>
          </form>

          <div className="mt-10 flex items-center justify-between gap-2">
            <div className="text-lg font-bold text-white">My Requests</div>
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-slate-300">Loading...</div>
          ) : items.length === 0 ? (
            <div className="mt-3 text-sm text-slate-300">No requests yet.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {items.map((x) => (
                <div key={x.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-white font-semibold">
                      #{x.id} — {x.title || "Untitled"}
                    </div>

                    <span className={`text-[11px] border px-2 py-[2px] rounded-full ${badge(x.status)}`}>
                      {String(x.status || "open")}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-300">
                    {x.category} • {x.priority}
                    {x.assigned_provider_name ? (
                      <>
                        {" "}
                        • Provider: <b className="text-slate-200">{x.assigned_provider_name}</b>
                      </>
                    ) : (
                      <>
                        {" "}
                        • Provider: <span className="text-slate-400">Not assigned</span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 text-sm text-slate-200 whitespace-pre-wrap">
                    {x.description || x.message || "—"}
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    Created: {x.created_at ? new Date(x.created_at).toLocaleString() : "-"}
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
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/20"
      >
        {options.map(([v, t]) => (
          <option key={v} value={v} className="bg-slate-900 text-white">
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
