import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import {
  Inbox,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Info,
  LayoutDashboard,
} from "lucide-react";

export default function RoommateRequests() {
  const nav = useNavigate();
  const { theme } = useTheme();

  const isDark = theme === "dark";

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
      const res = await api.get(REQ_URL);
      setReceived(Array.isArray(res?.data?.received) ? res.data.received : []);
      setSent(Array.isArray(res?.data?.sent) ? res.data.sent : []);
    } catch (e) {
      setErr("Failed to synchronize roommate requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const respond = async (requestId, action) => {
    setBusyId(requestId);
    try {
      await api.post(RESPOND_URL(requestId), { action });
      await loadRequests();
    } catch (e) {
      setErr("Could not process response at this time.");
    } finally {
      setBusyId(null);
    }
  };

  const openChat = (req) => {
    const tid = req?.thread_id;
    if (tid) nav(`/tenant/roommates/chats/${tid}`);
    else nav("/tenant/roommates/chats");
  };

  const RequestCard = ({ item, type }) => {
    const isReceived = type === "received";
    const status = (item?.status || "pending").toLowerCase();
    const name = isReceived
      ? item?.from_username || "Tenant"
      : item?.to_username || "Tenant";

    return (
      <div
        className={`group rounded-[32px] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
          isDark
            ? "border-white/10 bg-[#0f3258]/95 shadow-black/20"
            : "border-neutral-100 bg-white"
        }`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-[18px] font-black ${
                isReceived
                  ? isDark
                    ? "bg-blue-500/15 text-blue-200"
                    : "bg-blue-50 text-blue-600"
                  : isDark
                  ? "bg-violet-500/15 text-violet-200"
                  : "bg-purple-50 text-purple-600"
              }`}
            >
              {name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div
                className={`text-sm font-black uppercase tracking-tight transition-colors ${
                  isDark
                    ? "text-white group-hover:text-blue-300"
                    : "text-neutral-900 group-hover:text-blue-600"
                }`}
              >
                {name}
              </div>
              <div
                className={`mt-0.5 text-[10px] font-black uppercase tracking-widest ${
                  isDark ? "text-blue-100/60" : "text-neutral-400"
                }`}
              >
                {isReceived ? "Wants to connect" : "Awaiting response"}
              </div>
            </div>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
              status === "accepted"
                ? isDark
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-emerald-100 bg-emerald-50 text-emerald-600"
                : status === "rejected"
                ? isDark
                  ? "border-red-400/20 bg-red-500/10 text-red-300"
                  : "border-red-100 bg-red-50 text-red-600"
                : isDark
                ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                : "border-amber-100 bg-amber-50 text-amber-600"
            }`}
          >
            {status}
          </div>
        </div>

        <div
          className={`mb-6 rounded-2xl border p-4 text-sm font-medium italic ${
            isDark
              ? "border-white/10 bg-[#123a64] text-blue-50/85"
              : "border-neutral-100 bg-neutral-50 text-neutral-600"
          }`}
        >
          "{item.message || "Hi! I think we could be good roommates 🙂"}"
        </div>

        <div className="flex gap-2">
          {isReceived && status === "pending" && (
            <>
              <button
                disabled={busyId === item.id}
                onClick={() => respond(item.id, "accept")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 ${
                  isDark
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-neutral-900 hover:bg-black"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Accept
              </button>

              <button
                disabled={busyId === item.id}
                onClick={() => respond(item.id, "reject")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                  isDark
                    ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                    : "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                <XCircle className="h-3.5 w-3.5" /> Decline
              </button>
            </>
          )}

          {status === "accepted" && (
            <button
              onClick={() => openChat(item)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Start Conversation
            </button>
          )}

          {!isReceived && status === "pending" && (
            <div
              className={`flex w-full cursor-default items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest ${
                isDark
                  ? "bg-white/10 text-blue-100/65"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Pending Approval
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Shell
      title="Connection Requests"
      subtitle="Manage your outgoing and incoming roommate invitations."
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/tenant")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
              isDark
                ? "border border-white/10 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>

          <button
            onClick={() => nav("/tenant/roommates/chats")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
              isDark
                ? "border border-white/10 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Chats
          </button>

          <button
            onClick={() => nav("/tenant/roommates")}
            className={`rounded-2xl p-3 transition-all ${
              isDark
                ? "border border-blue-400/20 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-12">
        {err && (
          <div
            className={`flex items-center gap-2 rounded-2xl border p-4 text-xs font-bold ${
              isDark
                ? "border-red-400/20 bg-red-500/10 text-red-200"
                : "border-red-100 bg-red-50 text-red-600"
            }`}
          >
            <XCircle className="h-4 w-4" /> {err}
          </div>
        )}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Inbox className="h-5 w-5" />
              </div>
              <h2
                className={`text-xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Received Applications
              </h2>
            </div>

            {loading ? (
              [1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-48 animate-pulse rounded-[32px] ${
                    isDark ? "bg-white/10" : "bg-neutral-50"
                  }`}
                />
              ))
            ) : received.length === 0 ? (
              <div
                className={`flex h-48 flex-col items-center justify-center rounded-[32px] border p-8 text-center ${
                  isDark
                    ? "border-dashed border-white/10 bg-[#0f3258]/80 text-blue-100/60"
                    : "border-dashed border-neutral-200 bg-neutral-50 text-neutral-400"
                }`}
              >
                <Info className="mb-2 h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No incoming requests yet.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {received.map((r) => (
                  <RequestCard key={r.id} item={r} type="received" />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="mb-8 flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
                  isDark ? "bg-violet-600" : "bg-purple-600"
                }`}
              >
                <Send className="h-5 w-5" />
              </div>
              <h2
                className={`text-xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Sent Invitations
              </h2>
            </div>

            {loading ? (
              [1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-48 animate-pulse rounded-[32px] ${
                    isDark ? "bg-white/10" : "bg-neutral-50"
                  }`}
                />
              ))
            ) : sent.length === 0 ? (
              <div
                className={`flex h-48 flex-col items-center justify-center rounded-[32px] border p-8 text-center ${
                  isDark
                    ? "border-dashed border-white/10 bg-[#0f3258]/80 text-blue-100/60"
                    : "border-dashed border-neutral-200 bg-neutral-50 text-neutral-400"
                }`}
              >
                <Info className="mb-2 h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">You haven't sent any requests.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {sent.map((r) => (
                  <RequestCard key={r.id} item={r} type="sent" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}