// src/pages/tenant/Chats.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function getMyIdFromToken() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.user_id ?? payload?.userId ?? payload?.sub ?? null;
}

function getLastMessage(thread) {
  return (
    thread?.last_message ||
    thread?.latest_message ||
    thread?.recent_message ||
    null
  );
}

function getLastMessageText(thread) {
  const lm = getLastMessage(thread);
  return (
    lm?.text ||
    lm?.message ||
    lm?.body ||
    lm?.content ||
    ""
  );
}

function getLastMessageImage(thread) {
  const lm = getLastMessage(thread);
  return (
    lm?.image_url ||
    lm?.image ||
    lm?.photo ||
    lm?.picture ||
    lm?.attachment ||
    lm?.file ||
    ""
  );
}

function getLastMessageSenderId(thread) {
  const lm = getLastMessage(thread);
  const raw =
    lm?.sender_id ??
    lm?.sender?.id ??
    lm?.sender ??
    null;

  if (raw == null) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function getPreviewTime(thread) {
  const lm = getLastMessage(thread);
  return lm?.created_at || lm?.created || thread?.created_at || "";
}

export default function Chats() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const THREADS_URL = useMemo(() => "tenant/roommates/chats/", []);

  const myId = useMemo(() => {
    const id =
      user?.id ?? user?.user_id ?? user?.pk ?? user?.user?.id ?? null;
    const finalId = id ?? getMyIdFromToken();
    return finalId ? Number(finalId) : null;
  }, [user]);

  const loadThreads = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await axios.get(THREADS_URL);
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
      const name = (t.other_username || "").toLowerCase();
      const preview = getLastMessageText(t).toLowerCase();
      return name.includes(text) || preview.includes(text);
    });
  }, [q, threads]);

  const openThread = (id) => nav(`/tenant/roommates/chats/${id}`);

  const previewText = (t) => {
    const lm = getLastMessage(t);
    if (!lm) return "No messages yet";

    const senderId = getLastMessageSenderId(t);
    const isMine = myId && senderId && senderId === myId;
    const text = getLastMessageText(t);
    const hasImage = Boolean(getLastMessageImage(t));

    if (hasImage && text) {
      return isMine ? `You: 📷 ${text}` : `📷 ${text}`;
    }

    if (hasImage && !text) {
      return isMine ? "You sent an image" : "📷 Image received";
    }

    if (text) {
      return isMine ? `You: ${text}` : text;
    }

    return "No messages yet";
  };

  const previewTime = (t) => {
    const dt = getPreviewTime(t);
    return dt ? new Date(dt).toLocaleString() : "";
  };

  const unreadBadge = (t) => {
    const count =
      t?.unread_count ??
      t?.unread ??
      0;

    if (!count) return null;

    return (
      <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-blue-600 px-2 py-[2px] text-[11px] font-semibold text-white">
        {count}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Roommate Chats</h1>
            <p className="text-sm text-gray-600 mt-1">
              Open a chat and send text or image messages.
            </p>
          </div>

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
                  className="py-3 hover:bg-gray-50 rounded-lg px-2 cursor-pointer transition"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openThread(t.id);
                  }}
                  title="Open chat"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 flex items-center">
                        <span className="truncate">
                          {t.other_username || `Thread #${t.id}`}
                        </span>
                        {unreadBadge(t)}
                      </div>

                      <div className="text-sm text-gray-600 truncate max-w-[280px] mt-1">
                        {previewText(t)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 shrink-0">
                      {previewTime(t)}
                    </div>
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