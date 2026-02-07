import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";

export default function ProviderNotifications() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeArr = (d) => (Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : []);

  useEffect(() => {
    const token = localStorage.getItem("access");
    const role = localStorage.getItem("role");
    if (!token) return nav("/provider/auth", { replace: true });
    if (role !== "provider") return nav("/unauthorized", { replace: true });

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("notifications/");
      setItems(safeArr(res.data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    try {
      await api.patch(`notifications/${id}/read/`);
      load();
    } catch {}
  }

  return (
    <Shell title="Provider Notifications" subtitle="Updates about jobs assigned to you">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            onClick={() => nav("/provider/dashboard")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          >
            ← Back
          </button>
          <button
            onClick={load}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          {loading ? (
            <div className="text-sm text-slate-300">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-300">No notifications.</div>
          ) : (
            <div className="grid gap-3">
              {items.map((n) => (
                <div
                  key={n.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-semibold">{n.title || "Notification"}</div>
                      <div className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">
                        {n.message || "—"}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10 transition"
                        >
                          Mark read
                        </button>
                      )}
                      {n.link ? (
                        <button
                          onClick={() => nav(n.link)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10 transition"
                        >
                          Open
                        </button>
                      ) : null}
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
