// src/pages/tenant/Chats.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios"; // ✅ your axios instance

export default function Chats() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  // ✅ matches your urls.py
  const THREADS_URL = useMemo(() => "/tenant/roommates/chats/", []);

  const loadThreads = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await axios.get(THREADS_URL);

      // ✅ Your backend returns: { results: [...] }
      const list = Array.isArray(res?.data?.results) ? res.data.results : [];
      setThreads(list);
    } catch (e) {
      console.log("THREADS ERROR:", e?.response || e);
      setErr(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : "") ||
          "Failed to load chats."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return threads;

    return threads.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const other = (t.other_user?.username || t.other_username || "").toLowerCase();
      return title.includes(text) || other.includes(text);
    });
  }, [q, threads]);

  const openThread = (id) => {
    nav(`/tenant/roommates/chats/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Roommate Chats</h1>

          <div className="flex gap-2">
            <button
              onClick={() => nav(-1)}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              Back
            </button>
            <button
              onClick={loadThreads}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats..."
              className="w-full sm:flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {err && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {err}
            </div>
          )}

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-600">No chats found.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className="py-3 hover:bg-gray-50 rounded-lg px-2 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openThread(t.id);
                  }}
                  title="Open chat"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {t.title || t.other_user?.username || `Thread #${t.id}`}
                      </div>

                      <div className="text-sm text-gray-600 truncate max-w-[280px]">
                        {t.last_message?.text || t.last_message || "No messages yet"}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">
            Backend: <span className="font-mono">GET /api/tenant/roommates/chats/</span> returns{" "}
            <span className="font-mono">{`{ results: [...] }`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}