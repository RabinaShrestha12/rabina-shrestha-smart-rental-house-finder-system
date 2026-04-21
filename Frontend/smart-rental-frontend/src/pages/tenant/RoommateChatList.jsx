import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, MessageSquare } from "lucide-react";
import { useTheme } from "../../components/ThemeContext";
import axios from "../../api/axios";

function formatTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function getName(item) {
  return (
    item?.other_username ||
    item?.other_user?.username ||
    item?.username ||
    item?.name ||
    item?.user?.username ||
    "Unknown User"
  );
}

function getLastMessage(item) {
  if (typeof item?.last_message_text === "string" && item.last_message_text.trim()) {
    return item.last_message_text;
  }
  if (typeof item?.last_text === "string" && item.last_text.trim()) {
    return item.last_text;
  }
  if (typeof item?.message === "string" && item.message.trim()) {
    return item.message;
  }
  if (typeof item?.text === "string" && item.text.trim()) {
    return item.text;
  }
  if (item?.last_message && typeof item.last_message === "object") {
    if (typeof item.last_message.text === "string" && item.last_message.text.trim()) {
      return item.last_message.text;
    }
  }
  return "No messages yet";
}

function getLastTime(item) {
  return (
    item?.last_message_created_at ||
    item?.last_message?.created_at ||
    item?.updated_at ||
    item?.created_at ||
    ""
  );
}

function getChatId(item) {
  return item?.id || item?.room_id || item?.chat_id || item?.match_id || null;
}

export default function RoommateChatList() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const loadChats = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get("tenant/roommates/chats/");

      const data = res?.data || {};
      const list = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setThreads(list);
    } catch (e) {
      console.error("ROOMMATE_CHATS_ERROR:", e.response || e);
      setErr(
        e.response?.data?.detail ||
          e.response?.data?.message ||
          "Failed to load roommate chats. Please ensure your roommate profile is fully active."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((item) => {
      const name = getName(item).toLowerCase();
      const msg = getLastMessage(item).toLowerCase();
      return name.includes(query) || msg.includes(query);
    });
  }, [threads, q]);

  const COLORS = {
    bg: isDark ? "#0f172a" : "#eef5fb",
    card: isDark ? "#1e293b" : "#ffffff",
    cardBorder: isDark ? "border-slate-700/50" : "border-blue-100",
    textMain: isDark ? "text-white" : "text-slate-900",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    divider: isDark ? "divide-slate-700/50" : "divide-blue-50",
    heroSub: isDark ? "text-blue-100/90" : "text-blue-50",
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: COLORS.bg,
        color: isDark ? "#ffffff" : "#1a202c",
      }}
    >
      {/* more top space so content stays clearly below navbar */}
      <div className="mx-auto max-w-[1280px] px-5 pt-32 pb-10 lg:px-6 lg:pt-36">
        {/* Hero */}
        <div
          className="mb-6 rounded-[28px] px-7 py-7 shadow-xl md:px-8 md:py-8"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl lg:text-[42px]">
                Roommate Hub
              </h1>
              <p className={`mt-2 text-sm font-medium md:text-base ${COLORS.heroSub}`}>
                Connect and coordinate with your future housemates in a premium space.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => nav("/tenant/dashboard")}
                className="flex h-12 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 text-sm font-bold text-white transition-all hover:bg-white/20"
              >
                ← Dashboard
              </button>

              <button
                onClick={loadChats}
                className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-blue-600 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search + Stats */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations..."
              style={{
                backgroundColor: COLORS.card,
                color: isDark ? "#ffffff" : "#1a202c",
              }}
              className={`w-full rounded-[20px] border ${COLORS.cardBorder} py-4 pl-12 pr-5 text-sm font-medium shadow-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 placeholder:text-slate-400`}
            />
          </div>

          <div
            className={`flex min-w-[210px] items-center justify-between rounded-[20px] border ${COLORS.cardBorder} px-5 py-4 shadow-md`}
            style={{ backgroundColor: COLORS.card }}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Total Contacts
              </p>
              <p className="mt-1 text-xl font-black leading-none text-blue-600">
                {filtered.length}
              </p>
            </div>
            <div className="h-9 w-px bg-blue-100/30" />
            <MessageSquare className="h-7 w-7 text-blue-500/30" />
          </div>
        </div>

        {err && (
          <div className="mb-6 rounded-[22px] border border-red-100 bg-red-50 p-5 font-semibold text-red-600 shadow-md">
            {err}
          </div>
        )}

        {/* Chat List */}
        <div
          className={`overflow-hidden rounded-[28px] border ${COLORS.cardBorder} shadow-[0_14px_40px_rgba(0,0,0,0.10)]`}
          style={{ backgroundColor: COLORS.card }}
        >
          {loading ? (
            <div
              className="flex h-64 flex-col items-center justify-center p-8 text-slate-400"
              style={{ backgroundColor: COLORS.card }}
            >
              <div className="mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
              <p className="text-sm font-black uppercase tracking-widest">
                Loading Chats...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center md:p-16" style={{ backgroundColor: COLORS.card }}>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-50/40 text-blue-300">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className={`text-xl font-black ${COLORS.textMain}`}>No Chats Found</h3>
              <p className={`mt-2 text-sm font-medium ${COLORS.textMuted}`}>
                Start connecting with roommates to see your messages here.
              </p>
            </div>
          ) : (
            <div className={`divide-y ${COLORS.divider}`} style={{ backgroundColor: COLORS.card }}>
              {filtered.map((item, index) => {
                const name = getName(item);
                const lastMessage = getLastMessage(item);
                const lastTime = getLastTime(item);
                const chatId = getChatId(item);

                const gradients = [
                  "from-blue-500 to-indigo-500",
                  "from-violet-500 to-purple-500",
                  "from-pink-500 to-rose-500",
                  "from-emerald-500 to-teal-500",
                ];
                const avatarGradient = gradients[index % gradients.length];

                return (
                  <button
                    key={chatId || index}
                    onClick={() => chatId && nav(`/tenant/roommates/chats/${chatId}`)}
                    style={{ backgroundColor: COLORS.card }}
                    className="group w-full px-5 py-5 text-left transition-all hover:bg-blue-500/[0.03] md:px-6 md:py-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br ${avatarGradient} font-black text-white shadow-lg transition-transform group-hover:scale-105`}
                        >
                          <span className="text-xl">{initials(name)}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className={`truncate text-lg font-black tracking-tight transition-colors group-hover:text-blue-600 md:text-xl ${COLORS.textMain}`}
                            >
                              {name}
                            </h2>

                            <div className="rounded-lg bg-blue-100/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">
                              Verified
                            </div>
                          </div>

                          <p
                            className={`mt-2 line-clamp-1 text-sm font-medium transition-colors ${COLORS.textMuted} group-hover:text-blue-400/80`}
                          >
                            {lastMessage}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500/60">
                            <span className="flex items-center gap-2 text-emerald-500/80">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                              Synced
                            </span>
                            <span>#ID{chatId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden shrink-0 text-right md:block">
                        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500/60">
                          {formatTime(lastTime)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500/60 md:hidden">
                      {formatTime(lastTime)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}