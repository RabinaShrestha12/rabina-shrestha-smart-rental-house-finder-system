// src/pages/tenant/RoommateRequests.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

export default function RoommateRequests() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const REQ_URL = useMemo(() => "tenant/roommates/requests/", []);
  const RESPOND_URL = (id) => `tenant/roommates/request/${id}/respond/`;

  const loadRequests = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await axios.get(REQ_URL);
      setReceived(Array.isArray(res?.data?.received) ? res.data.received : []);
      setSent(Array.isArray(res?.data?.sent) ? res.data.sent : []);
    } catch (e) {
      console.log("REQUESTS ERROR:", e?.response || e);
      setErr(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : "") ||
          "Failed to load roommate requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const respond = async (requestId, action) => {
    setBusyId(requestId);
    setErr("");
    try {
      await axios.post(RESPOND_URL(requestId), { action });
      await loadRequests();
    } catch (e) {
      console.log("RESPOND ERROR:", e?.response || e);
      setErr(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : "") ||
          "Failed to update request."
      );
    } finally {
      setBusyId(null);
    }
  };

  // ✅ one tenant can chat with multiple tenants
  // each accepted request has its own thread_id
  const openChat = (req) => {
    const tid = req?.thread_id;
    if (tid) nav(`/tenant/roommates/chats/${tid}`);
    else nav("/tenant/roommates/chats");
  };

  // ✅ show tenant names (NO more "User")
  const receivedName = (r) => r?.from_username || "Tenant";
  const sentName = (r) => r?.to_username || "Tenant";

  const card =
    "p-4 rounded-xl bg-white shadow-sm flex items-center justify-between gap-4";

  const renderReceived = (r) => {
    const status = (r?.status || "").toLowerCase();
    return (
      <div key={r.id} className={card}>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {receivedName(r)}
          </div>
          <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
            {r.message ? `Hi! ${r.message}` : "No message"}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Status: <span className="font-medium">{status}</span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {status === "pending" && (
            <>
              <button
                disabled={busyId === r.id}
                onClick={() => respond(r.id, "accept")}
                className={`px-4 py-2 rounded-lg text-white ${
                  busyId === r.id ? "bg-green-300" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Accept
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => respond(r.id, "reject")}
                className={`px-4 py-2 rounded-lg text-white ${
                  busyId === r.id ? "bg-red-300" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Reject
              </button>
            </>
          )}

          {status === "accepted" && (
            <button
              onClick={() => openChat(r)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Message
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSent = (r) => {
    const status = (r?.status || "").toLowerCase();
    return (
      <div key={r.id} className={card}>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            To: {sentName(r)}
          </div>
          <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
            {r.message ? `Hi! ${r.message}` : "No message"}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Status: <span className="font-medium">{status}</span>
          </div>
        </div>

        {status === "accepted" && (
          <button
            onClick={() => openChat(r)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Message
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Roommate Requests</h1>
            <div className="text-sm text-blue-200 mt-1">
              People who want to share with you
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => nav("/tenant/roommates/chats")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              💬 Chats
            </button>
            <button
              onClick={() => nav(-1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              ← Back
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 border border-white/10 rounded-2xl p-6">
          {/* RECEIVED */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-lg font-semibold mb-4">Received</div>
            {loading ? (
              <div className="text-blue-200">Loading...</div>
            ) : received.length === 0 ? (
              <div className="text-blue-200">No received requests.</div>
            ) : (
              <div className="space-y-3">{received.map(renderReceived)}</div>
            )}
          </div>

          {/* SENT */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-lg font-semibold mb-4">Sent</div>
            {loading ? (
              <div className="text-blue-200">Loading...</div>
            ) : sent.length === 0 ? (
              <div className="text-blue-200">No sent requests.</div>
            ) : (
              <div className="space-y-3">{sent.map(renderSent)}</div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-blue-200 mt-6 opacity-80">
          Smart Rental • React + Django + JWT
        </div>
      </div>
    </div>
  );
}