import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    if (typeof item.last_message.sender_username === "string") {
      return `Message from ${item.last_message.sender_username}`;
    }
  }

  if (typeof item?.last_message === "string" && item.last_message.trim()) {
    return item.last_message;
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

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const loadChats = async () => {
    setLoading(true);
    setErr("");

    try {
      const res = await axios.get("tenant/roommates/chats/");
      const list = Array.isArray(res?.data?.results)
        ? res.data.results
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setThreads(list);
    } catch (e) {
      console.log("ROOMMATE CHAT LIST ERROR:", e?.response || e);
      setErr(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : "") ||
          "Failed to load roommate chats."
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Roommate Chats
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                Open a chat and send text or image messages.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => nav("/tenant/dashboard")}
                className="rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
              >
                Back
              </button>
              <button
                onClick={loadChats}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow transition hover:bg-indigo-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
            Total Chats:{" "}
            <span className="font-bold text-indigo-700">{filtered.length}</span>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl backdrop-blur-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading chats...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-lg font-semibold text-slate-800">
                No chats found
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Try another search or start a new roommate conversation.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item, index) => {
                const name = getName(item);
                const lastMessage = getLastMessage(item);
                const lastTime = getLastTime(item);
                const chatId = getChatId(item);

                const gradients = [
                  "from-blue-500 to-cyan-500",
                  "from-violet-500 to-purple-500",
                  "from-pink-500 to-rose-500",
                  "from-emerald-500 to-teal-500",
                ];

                const avatarGradient = gradients[index % gradients.length];

                return (
                  <button
                    key={chatId || index}
                    onClick={() => chatId && nav(`/tenant/roommates/chats/${chatId}`)}
                    className="w-full px-4 py-4 text-left transition hover:bg-gradient-to-r hover:from-blue-50 hover:to-violet-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${avatarGradient} font-bold text-white shadow-md`}
                        >
                          {initials(name)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-bold text-slate-900">
                              {name}
                            </h3>
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Chat
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-slate-600">
                            {lastMessage}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
                          {formatTime(lastTime)}
                        </div>
                      </div>
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