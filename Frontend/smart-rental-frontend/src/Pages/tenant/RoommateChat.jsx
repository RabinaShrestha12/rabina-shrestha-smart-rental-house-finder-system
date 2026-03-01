// src/pages/tenant/RoommateChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../api/axios";
import { useAuth } from "../../auth/AuthContext"; // adjust if needed

export default function RoommateChat() {
  const nav = useNavigate();
  const { roomId } = useParams(); // roomId == thread_id
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const bottomRef = useRef(null);

  // ✅ matches your urls.py
  const MESSAGES_URL = useMemo(
    () => `tenant/roommates/chats/${roomId}/messages/`,
    [roomId]
  );
  const SEND_URL = useMemo(
    () => `tenant/roommates/chats/${roomId}/send/`,
    [roomId]
  );

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const loadMessages = async (silent = false) => {
    if (!silent) setErr("");
    try {
      const res = await axios.get(MESSAGES_URL);

      // ✅ Your backend returns: { thread_id: X, results: [...] }
      const list = Array.isArray(res?.data?.results) ? res.data.results : [];
      setMessages(list);

      if (!silent) setTimeout(() => scrollToBottom(false), 50);
    } catch (e) {
      console.log("MESSAGES ERROR:", e?.response || e);
      if (!silent) {
        setErr(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            (typeof e?.response?.data === "string" ? e.response.data : "") ||
            "Failed to load messages."
        );
      }
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadMessages();
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // polling
  useEffect(() => {
    const t = setInterval(() => loadMessages(true), 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const isMine = (m) => {
    const myId = user?.id;
    const senderId = m?.sender?.id || m?.sender_id;
    if (!myId || !senderId) return false;
    return Number(myId) === Number(senderId);
  };

  const onSend = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || sending) return;

    setSending(true);
    setErr("");

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text: msg,
      sender: user ? { id: user.id, username: user.username } : null,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => scrollToBottom(true), 30);

    try {
      // ✅ backend returns message serializer directly
      const res = await axios.post(SEND_URL, { text: msg });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
      scrollToBottom(true);
    } catch (e2) {
      console.log("SEND ERROR:", e2?.response || e2);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(msg);
      setErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.message ||
          (typeof e2?.response?.data === "string" ? e2.response.data : "") ||
          "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-sm text-gray-500">Roommate Chat</div>
            <h1 className="text-xl font-bold text-gray-900">Thread #{roomId}</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => nav("/tenant/roommates/chats")}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              Chats
            </button>
            <button
              onClick={() => loadMessages()}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {err}
          </div>
        )}

        <div className="bg-white rounded-xl shadow border">
          <div className="h-[65vh] overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="text-gray-600">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-600">No messages yet. Say hi 👋</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${isMine(m) ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      isMine(m)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {!isMine(m) && (
                      <div className="text-[11px] opacity-70 mb-1">
                        {m?.sender?.username || m?.sender_name || "User"}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className="text-[10px] opacity-70 mt-1 text-right">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ""}
                      {m._optimistic ? " • sending..." : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSend} className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                disabled={sending || !text.trim()}
                className={`px-4 py-2 rounded-xl text-white ${
                  sending || !text.trim()
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Send
              </button>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Backend:{" "}
              <span className="font-mono">
                GET /api/tenant/roommates/chats/{roomId}/messages/
              </span>{" "}
              returns <span className="font-mono">{`{ thread_id, results: [...] }`}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}