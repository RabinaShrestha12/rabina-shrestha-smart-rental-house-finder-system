import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import {
  RefreshCw,
  MessageSquare,
  Send,
  ImageIcon,
  X,
  ArrowLeft,
  Trash2,
  Edit3,
  Check,
} from "lucide-react";

function getBackendBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
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

function arrify(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function RoommateChat() {
  const { roomId } = useParams();
  const { role } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const editInputRef = useRef(null);

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token || (role !== "tenant" && role !== "admin")) {
      nav("/auth", { replace: true });
    }
  }, [role, nav]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!editingId) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, editingId]);

  const loadThreadDetails = async () => {
    try {
      const res = await api.get("tenant/roommates/chats/");
      const list = arrify(res.data);
      const found = list.find((t) => String(t.id) === String(roomId));
      if (found) setThread(found);
    } catch (e) {
      console.error("Failed to load thread details", e);
    }
  };

  const loadMessages = async (showLoader = true) => {
    if (!roomId) return;
    if (showLoader) setLoading(true);
    try {
      const res = await api.get(`tenant/roommates/chats/${roomId}/messages/`);
      setMessages(arrify(res.data));
    } catch (e) {
      setToast({ type: "error", msg: "Failed to load chat messages." });
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) {
      loadThreadDetails();
      loadMessages();
    }
  }, [roomId]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", msg: "Please choose a valid image file." });
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendReply = async () => {
    if (!roomId || (!reply.trim() && !selectedImage)) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("text", reply.trim());
      if (selectedImage) formData.append("image", selectedImage);

      await api.post(`tenant/roommates/chats/${roomId}/send/`, formData);

      setReply("");
      clearSelectedImage();
      await loadMessages(false);
      setToast({ type: "success", msg: "Message sent." });
      if (textareaRef.current) textareaRef.current.focus();
    } catch (e) {
      setToast({ type: "error", msg: "Failed to send message." });
    } finally {
      setSending(false);
    }
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && (reply.trim() || selectedImage)) sendReply();
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.delete(`tenant/roommates/messages/${msgId}/delete/`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setToast({ type: "success", msg: "Message deleted." });
    } catch (e) {
      setToast({ type: "error", msg: "Failed to delete message." });
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditValue(m.text || m.message || m.content || "");
    setTimeout(() => editInputRef.current?.focus(), 100);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    setUpdating(true);
    try {
      await api.patch(`tenant/roommates/messages/${editingId}/update/`, {
        text: editValue.trim(),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, text: editValue.trim() } : m))
      );
      setEditingId(null);
      setEditValue("");
      setToast({ type: "success", msg: "Message updated." });
    } catch (e) {
      setToast({ type: "error", msg: "Failed to update message." });
    } finally {
      setUpdating(false);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const formatDate = (s) =>
    s
      ? new Date(s).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

  const opponentName = thread?.other_username || "Roommate";
  const initials = opponentName.slice(0, 2).toUpperCase();

  return (
    <Shell
      title="Roommate Conversation"
      subtitle={`Chatting with ${opponentName}`}
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-[#12345c] text-blue-100 hover:bg-[#163d6d]"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <button
            onClick={() => loadMessages(true)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-[#173f73] text-blue-100 hover:bg-[#1a487f]"
                : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className={`flex min-h-[680px] flex-col overflow-hidden rounded-[30px] border shadow-sm ${
            isDark ? "border-blue-400/15 bg-[#0f2947]" : "border-neutral-200 bg-white"
          }`}
        >
          {/* Compact Desktop Header */}
          <div
            className={`border-b px-6 py-5 lg:px-8 ${
              isDark ? "border-blue-400/10" : "border-neutral-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-black text-white shadow-lg">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  className={`truncate text-2xl font-black ${
                    isDark ? "text-white" : "text-neutral-900"
                  }`}
                >
                  {opponentName}
                </h3>
                <div
                  className={`mt-1 flex items-center gap-2 text-sm ${
                    isDark ? "text-blue-200/70" : "text-neutral-500"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Roommate Thread #{roomId}
                </div>
              </div>
            </div>
          </div>

          {/* Message Area */}
          <div
            className={`flex-1 overflow-y-auto px-5 py-5 lg:px-8 lg:py-6 ${
              isDark ? "bg-[#0b2340]" : "bg-neutral-50/60"
            }`}
            style={{ minHeight: "430px", maxHeight: "calc(100vh - 300px)" }}
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <RefreshCw className="h-10 w-10 animate-spin text-blue-500/50" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="mb-4 h-14 w-14 text-blue-500/20" />
                <h4
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-neutral-900"
                  }`}
                >
                  No messages yet
                </h4>
                <p
                  className={`mt-1 text-sm ${
                    isDark ? "text-blue-200/70" : "text-neutral-500"
                  }`}
                >
                  Start a conversation with your potential roommate.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((m, idx) => {
                  const isOpponent = m.sender_name === thread?.other_username;
                  const isEditing = editingId === m.id;

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex ${isOpponent ? "justify-start" : "justify-end"}`}
                    >
                      <div className="group relative max-w-[78%] xl:max-w-[68%]">
                        <div
                          className={`mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${
                            isOpponent
                              ? isDark
                                ? "text-slate-400"
                                : "text-neutral-400"
                              : "text-blue-500"
                          }`}
                        >
                          {m.sender_name} • {formatDate(m.created_at)}
                        </div>

                        <div
                          className={`rounded-[22px] p-4 shadow-sm transition-all ${
                            isOpponent
                              ? isDark
                                ? "rounded-tl-none border border-slate-700/50 bg-slate-800 text-slate-100"
                                : "rounded-tl-none border border-neutral-100 bg-white text-neutral-800"
                              : "rounded-tr-none border border-blue-400/20 bg-blue-300 text-blue-950"
                          }`}
                        >
                          {m.image_url && (
                            <img
                              src={buildFullMediaUrl(m.image_url)}
                              alt="attachment"
                              className="mb-3 max-h-56 rounded-xl object-cover shadow-sm"
                            />
                          )}

                          {isEditing ? (
                            <div className="flex min-w-[220px] flex-col gap-3">
                              <textarea
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                className="w-full rounded-xl border-none bg-white/50 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelEdit}
                                  className="rounded-full p-2 text-slate-600 hover:bg-black/5"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={saveEdit}
                                  disabled={updating || !editValue.trim()}
                                  className="rounded-full bg-blue-600 p-2 text-white shadow-sm hover:bg-blue-700"
                                >
                                  {updating ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {m.text || m.message || m.content}
                            </p>
                          )}
                        </div>

                        {!isOpponent && !isEditing && (
                          <div className="absolute -left-11 top-1/2 flex -translate-y-1/2 flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(m)}
                              className="rounded-full border border-blue-100 bg-white/90 p-2 text-blue-600 shadow-sm hover:bg-white"
                              title="Edit"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(m.id)}
                              className="rounded-full border border-red-100 bg-white/90 p-2 text-red-500 shadow-sm hover:bg-white"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div
            className={`border-t p-5 lg:p-6 ${
              isDark
                ? "border-blue-400/10 bg-[#102d50]"
                : "border-neutral-100 bg-white"
            }`}
          >
            {previewUrl && (
              <div className="mb-4 flex items-center gap-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-3">
                <img
                  src={previewUrl}
                  className="h-20 w-20 rounded-xl object-cover shadow-md"
                  alt="Preview"
                />
                <button
                  onClick={clearSelectedImage}
                  className="rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-4">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Type a message..."
                  className={`w-full max-h-36 resize-none rounded-[24px] border-2 py-4 pl-5 pr-14 text-sm font-medium outline-none transition-all ${
                    isDark
                      ? "border-blue-400/10 bg-[#0d223a] text-white focus:border-blue-500/50"
                      : "border-neutral-100 bg-neutral-50 text-neutral-900 focus:border-blue-500/50"
                  }`}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-4 rounded-full p-2 text-blue-500 transition hover:bg-blue-500/10"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <button
                onClick={sendReply}
                disabled={sending || (!reply.trim() && !selectedImage)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                {sending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}