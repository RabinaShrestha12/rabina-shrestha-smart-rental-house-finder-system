// src/pages/tenant/RoommateChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function formatDayLabel(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function getBackendBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  );
}

function buildFullMediaUrl(raw) {
  if (!raw) return "";

  const value = String(raw).trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${getBackendBaseUrl()}${value}`;
  if (value.startsWith("media/")) return `${getBackendBaseUrl()}/${value}`;

  return `${getBackendBaseUrl()}/media/${value}`;
}

function getMsgText(m) {
  return m?.text || m?.message || m?.body || m?.content || "";
}

function getMsgImage(m) {
  const raw =
    m?.image_url ||
    m?.image ||
    m?.photo ||
    m?.picture ||
    m?.attachment ||
    m?.file ||
    m?.media ||
    m?.media_url ||
    "";
  return buildFullMediaUrl(raw);
}

export default function RoommateChat() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const [otherName, setOtherName] = useState("");
  const bottomRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  const MESSAGES_URL = useMemo(
    () => `tenant/roommates/chats/${roomId}/messages/`,
    [roomId]
  );
  const SEND_URL = useMemo(
    () => `tenant/roommates/chats/${roomId}/send/`,
    [roomId]
  );

  const myId = useMemo(() => {
    const id =
      user?.id ??
      user?.user_id ??
      user?.pk ??
      user?.user?.id ??
      user?.user?.user_id ??
      null;

    const finalId = id ?? getMyIdFromToken();
    return finalId ? Number(finalId) : null;
  }, [user]);

  const getSenderId = (m) => {
    const sid = m?.sender_id ?? m?.sender?.id ?? m?.sender ?? null;
    return sid ? Number(sid) : null;
  };

  const isMine = (m) => {
    const sid = getSenderId(m);
    if (!myId || !sid) return false;
    return myId === sid;
  };

  const senderName = (m) => {
    if (isMine(m)) return "You";
    return m?.sender_username || m?.sender?.username || "Tenant";
  };

  const senderInitials = (m) => initials(senderName(m));

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const loadOtherName = async () => {
    try {
      const res = await axios.get("tenant/roommates/chats/");
      const list = Array.isArray(res?.data?.results) ? res.data.results : [];
      const t = list.find((x) => Number(x?.id) === Number(roomId));
      const name = t?.other_username || t?.other_user?.username || "";
      setOtherName(name);
    } catch {
      setOtherName("");
    }
  };

  const loadMessages = async (silent = false) => {
    if (!silent) setErr("");
    try {
      const res = await axios.get(MESSAGES_URL);
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
      await loadOtherName();
      await loadMessages();
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const t = setInterval(() => loadMessages(true), 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErr("Please choose a valid image file.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    const msg = text.trim();

    if ((!msg && !selectedImage) || sending) return;

    setSending(true);
    setErr("");

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text: msg,
      image: selectedImage ? previewUrl : "",
      image_url: selectedImage ? previewUrl : "",
      sender_id: myId,
      sender_username: user?.username || "You",
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    clearSelectedImage();
    setTimeout(() => scrollToBottom(true), 20);

    try {
      const formData = new FormData();
      formData.append("text", msg);
      formData.append("message", msg);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const res = await axios.post(SEND_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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

  const rendered = useMemo(() => {
    const out = [];
    let lastDate = null;

    for (const m of messages) {
      const dt = m?.created_at;
      if (dt && (!lastDate || !sameDay(lastDate, dt))) {
        out.push({ _type: "date", id: `date-${dt}`, label: formatDayLabel(dt) });
        lastDate = dt;
      }
      out.push({ _type: "msg", ...m });
    }
    return out;
  }, [messages]);

  const headerTitle = otherName ? `Chat with ${otherName}` : `Thread #${roomId}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 grid place-items-center text-white font-semibold">
              {initials(otherName || "Tenant")}
            </div>
            <div>
              <div className="text-xs text-slate-300">Roommate Chat</div>
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">
                {headerTitle}
              </h1>
              <div className="text-xs text-slate-300 mt-0.5">
                Private chat • Only you & {otherName || "tenant"}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => nav(-1)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition"
            >
              Back
            </button>
            <button
              onClick={() => nav("/tenant/roommates/chats")}
              className="px-3 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition"
            >
              Chats
            </button>
            <button
              onClick={() => {
                loadOtherName();
                loadMessages();
              }}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-400/30 text-red-100">
            {err}
          </div>
        )}

        <div className="rounded-3xl bg-white/5 border border-white/10 shadow-xl overflow-hidden">
          <div className="h-[68vh] overflow-y-auto px-4 sm:px-6 py-5 space-y-3">
            {loading ? (
              <div className="text-slate-200">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="grid place-items-center h-full text-center">
                <div className="max-w-sm">
                  <div className="text-white font-semibold text-lg">No messages yet</div>
                  <div className="text-slate-300 text-sm mt-1">
                    Start the conversation with {otherName || "this tenant"} 👋
                  </div>
                </div>
              </div>
            ) : (
              rendered.map((item) => {
                if (item._type === "date") {
                  return (
                    <div key={item.id} className="flex justify-center my-2">
                      <span className="text-[11px] text-slate-300 bg-white/10 border border-white/10 px-3 py-1 rounded-full">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const mine = isMine(item);
                const time = item?.created_at ? formatTime(item.created_at) : "";
                const name = senderName(item);
                const avatar = senderInitials(item);
                const msgText = getMsgText(item);
                const msgImage = getMsgImage(item);

                return (
                  <div
                    key={item.id}
                    className={`w-full flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {!mine && (
                      <div className="mr-2 mt-5 hidden sm:flex">
                        <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 grid place-items-center text-white text-xs font-semibold">
                          {avatar}
                        </div>
                      </div>
                    )}

                    <div className={`max-w-[82%] sm:max-w-[70%] ${mine ? "text-right" : "text-left"}`}>
                      <div className={`text-[11px] text-slate-300 mb-1 px-1 ${mine ? "opacity-80" : ""}`}>
                        {name}
                      </div>

                      <div
                        className={`inline-block rounded-3xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm ${
                          mine
                            ? "bg-blue-600 text-white rounded-br-xl"
                            : "bg-white text-slate-900 rounded-bl-xl"
                        }`}
                      >
                        {msgImage ? (
                          <div className="mb-2">
                            <img
                              src={msgImage}
                              alt="chat upload"
                              className="max-w-[220px] sm:max-w-[280px] rounded-2xl border border-black/10"
                              onError={(e) => {
                                console.log("Roommate image failed:", msgImage, item);
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        ) : null}

                        {msgText ? <div>{msgText}</div> : null}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 px-1">
                        {time}
                        {item._optimistic ? " • sending..." : ""}
                      </div>
                    </div>

                    {mine && (
                      <div className="ml-2 mt-5 hidden sm:flex">
                        <div className="h-9 w-9 rounded-2xl bg-blue-600/20 border border-blue-500/30 grid place-items-center text-blue-100 text-xs font-semibold">
                          {initials(user?.username || "You")}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSend} className="border-t border-white/10 bg-white/5 px-4 sm:px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="sr-only">Message</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend(e);
                    }
                  }}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white text-slate-900 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition"
                  >
                    Choose Image
                  </button>

                  {selectedImage ? (
                    <span className="text-[11px] text-slate-200 break-all">
                      {selectedImage.name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      No image selected
                    </span>
                  )}
                </div>

                {previewUrl ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 w-fit">
                    <div className="text-[11px] text-slate-300 mb-2">Image preview</div>
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="max-w-[150px] rounded-2xl border border-white/10"
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="text-xs px-3 py-1 rounded-lg bg-red-500/10 border border-red-400/20 text-red-200 hover:bg-red-500/15"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="text-[11px] text-slate-400 mt-2">
                  Press <span className="font-semibold">Enter</span> to send •{" "}
                  <span className="font-semibold">Shift+Enter</span> for new line
                </div>
              </div>

              <button
                type="submit"
                disabled={sending || (!text.trim() && !selectedImage)}
                className={`px-5 py-3 rounded-2xl text-white font-semibold transition ${
                  sending || (!text.trim() && !selectedImage)
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-xs text-slate-400 mt-4">
          Smart Rental • React + Django + JWT
        </div>
      </div>
    </div>
  );
}