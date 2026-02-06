import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function OwnerMaintenance() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get("owner/maintenance/");
      setItems(res.data || []);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to load owner maintenance inbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status) {
    setMsg("");
    try {
      await api.patch(`owner/maintenance/${id}/status/`, { status });
      setMsg("✅ Status updated");
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to update status.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-5">
        <h1 className="text-2xl font-bold">Owner Maintenance Inbox</h1>
        <p className="opacity-70 text-sm mt-1">
          Update status: open → in_progress → resolved / rejected
        </p>

        {msg && (
          <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            {msg}
          </div>
        )}

        <div className="mt-5">
          {loading ? (
            <div className="opacity-70">Loading...</div>
          ) : items.length === 0 ? (
            <div className="opacity-70">No requests yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((x) => (
                <div
                  key={x.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="font-bold">
                      #{x.id} — {x.title}
                    </div>
                    <div className="text-sm opacity-70">
                      {x.status} | {x.priority} | {x.category}
                    </div>
                  </div>

                  <div className="text-sm mt-2 whitespace-pre-wrap">{x.description}</div>

                  <div className="text-xs mt-2 opacity-60">
                    Listing: {x.listing} | Tenant: {x.tenant} | Created:{" "}
                    {x.created_at ? new Date(x.created_at).toLocaleString() : "-"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(x.id, "open")}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => updateStatus(x.id, "in_progress")}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => updateStatus(x.id, "resolved")}
                      className="px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => updateStatus(x.id, "rejected")}
                      className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                    >
                      Rejected
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={load}
            className="mt-5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
