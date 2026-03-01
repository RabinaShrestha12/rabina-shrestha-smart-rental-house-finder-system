import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import api from "../../api/axios";

export default function RoommateRequests() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [toast, setToast] = useState({ type: "info", msg: "" });

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setToast({ type: "info", msg: "" });
      const res = await api.get("tenant/roommates/requests/");
      setReceived(res.data?.received || []);
      setSent(res.data?.sent || []);
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to load roommate requests.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const respond = async (requestId, action) => {
    try {
      setToast({ type: "info", msg: "" });
      const res = await api.post(`tenant/roommates/request/${requestId}/respond/`, { action });

      if (action === "accept") {
        const chatId = res?.data?.chat_id;
        setToast({ type: "success", msg: "Request accepted ✅ Chat created." });

        // ✅ go to chat directly
        if (chatId) {
          nav(`/tenant/roommates/chat/${chatId}`);
          return;
        }
      } else {
        setToast({ type: "success", msg: `Request ${action}ed ✅` });
      }

      fetchRequests();
    } catch (e) {
      setToast({ type: "error", msg: axiosErr(e, "Failed to respond.") });
    }
  };

  return (
    <Shell
      title="Roommate Requests"
      subtitle="People who want to share with you"
      right={
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => nav("/tenant/roommates/chats")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            💬 Chats
          </button>
          <button
            onClick={() => nav("/tenant/roommates")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            ← Back
          </button>
        </div>
      }
    >
      {toast.msg && (
        <div
          className={`mb-3 rounded-xl border p-3 text-sm whitespace-pre-wrap ${
            toast.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-200"
              : toast.type === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-white/10 bg-white/5 text-slate-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* RECEIVED */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <div className="text-sm font-semibold mb-3">Received</div>

          {loading ? (
            <div className="text-sm text-slate-300">Loading…</div>
          ) : received.length === 0 ? (
            <div className="text-sm text-slate-300">No received requests yet.</div>
          ) : (
            <div className="space-y-3">
              {received.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{r.from_username}</div>
                      <div className="text-xs text-slate-300 mt-1">{r.message || "—"}</div>
                      <div className="text-xs text-slate-300 mt-1">Status: {r.status}</div>
                    </div>

                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(r.id, "accept")}
                          className="rounded-xl border border-white/10 bg-emerald-600/30 px-3 py-2 text-xs hover:bg-emerald-600/40 transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respond(r.id, "reject")}
                          className="rounded-xl border border-white/10 bg-red-600/30 px-3 py-2 text-xs hover:bg-red-600/40 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {r.status === "accepted" && (
                      <button
                        onClick={() => nav("/tenant/roommates/chats")}
                        className="rounded-xl border border-white/10 bg-sky-600/30 px-3 py-2 text-xs hover:bg-sky-600/40 transition"
                      >
                        Message
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SENT */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <div className="text-sm font-semibold mb-3">Sent</div>

          {loading ? (
            <div className="text-sm text-slate-300">Loading…</div>
          ) : sent.length === 0 ? (
            <div className="text-sm text-slate-300">No sent requests yet.</div>
          ) : (
            <div className="space-y-3">
              {sent.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="font-semibold text-sm">To: {r.to_username}</div>
                  <div className="text-xs text-slate-300 mt-1">{r.message || "—"}</div>
                  <div className="text-xs text-slate-300 mt-1">Status: {r.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}