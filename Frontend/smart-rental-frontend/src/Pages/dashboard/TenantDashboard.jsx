// src/pages/dashboard/TenantDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import Shell from "../../components/Shell";
import api from "../../api/axios";
import {
  Search,
  Heart,
  MessageSquare,
  MapPin,
  Sparkles,
  Users,
  Sofa,
  Calculator,
  Wallet,
  CreditCard,
  LogOut,
  Info,
  X,
  Send,
  Calendar,
  Inbox,
  RefreshCw,
  Home,
  ArrowRight,
  Bell,
  CheckCircle2,
  WalletCards,
  BarChart3,
} from "lucide-react";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) {
    return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200";
  }

  const s = String(value).trim();

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

export default function TenantDashboard() {
  const { role, email, logout, isAuthed } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigate();

  const isDark = theme === "dark";
  const username = email?.split("@")[0] || "Tenant";

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [q, setQ] = useState("");
  const [priceFilter, setPriceFilter] = useState("any");

  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem("tenant_favorites");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Request Accepted",
      message: "Your booking request has been accepted by the owner.",
      type: "accepted",
      read: false,
      actionPath: "/tenant/booking-payments",
    },
    {
      id: 2,
      title: "New Message",
      message: "You received a new message in your inbox.",
      type: "message",
      read: false,
      actionPath: "/tenant/inbox",
    },
    {
      id: 3,
      title: "Expense Tracking",
      message: "Track this month's rental and living expenses.",
      type: "expense",
      read: false,
      actionPath: "/tenant/expenses",
    },
    {
      id: 4,
      title: "Monthly Income Report",
      message: "Your monthly expense and income report is ready to view.",
      type: "report",
      read: false,
      actionPath: "/tenant/expenses",
    },
  ]);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const [inboxUnreadCount, setInboxUnreadCount] = useState(3);

  useEffect(() => {
    localStorage.setItem("tenant_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (toast.msg) {
      const t = setTimeout(() => {
        setToast({ type: "info", msg: "" });
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
      nav("/unauthorized", { replace: true });
    }
  }, [isAuthed, role, nav]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  const safeArr = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getId = (item) => item?.id ?? item?.pk ?? item?.listing_id ?? item?.property_id;
  const getTitle = (x) => x?.title || x?.property_name || x?.name || "Property";
  const getAddress = (x) => x?.address || x?.location || x?.city || x?.area || "Nepal";
  const getRent = (x) => x?.rent ?? x?.price ?? x?.monthly_rent ?? null;
  const getType = (x) => x?.property_type || x?.type || "House";
  const getDescription = (x) =>
    x?.description ||
    x?.details ||
    x?.about ||
    "A premium rental property managed through the Smart Rental platform.";

  const getImage = (x) =>
    x?.image_url ||
    x?.image ||
    x?.cover ||
    x?.thumbnail ||
    x?.main_image ||
    x?.photo ||
    x?.pano_front_url ||
    x?.front_image ||
    null;

  const currency = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n.toLocaleString();
  };

  const fetchListings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("public/listings/");
      setListings(safeArr(res.data));
    } catch (e) {
      setError("Could not load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthed && role === "tenant") fetchListings();
  }, [isAuthed, role]);

  const filteredListings = useMemo(() => {
    const query = q.trim().toLowerCase();

    const priceOk = (rent) => {
      const n = Number(rent);
      if (Number.isNaN(n) || priceFilter === "any") return true;
      if (priceFilter === "lt5000") return n < 5000;
      if (priceFilter === "5000_10000") return n >= 5000 && n <= 10000;
      if (priceFilter === "gt10000") return n > 10000;
      return true;
    };

    return listings.filter((x) => {
      const t = (getTitle(x) || "").toLowerCase();
      const a = (getAddress(x) || "").toLowerCase();
      const d = (getDescription(x) || "").toLowerCase();

      const matchQuery =
        !query || t.includes(query) || a.includes(query) || d.includes(query);

      return matchQuery && priceOk(getRent(x));
    });
  }, [listings, q, priceFilter]);

  const featuredListings = useMemo(() => filteredListings.slice(0, 8), [filteredListings]);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const toggleFavorite = (item) => {
    const id = getId(item);
    if (!id) return;

    setFavorites((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      setToast({
        type: "success",
        msg: has ? "Removed from favorites." : "Saved to favorites.",
      });
      return next;
    });
  };

  const isFav = (item) => {
    const id = getId(item);
    return id ? favorites.includes(id) : false;
  };

  const openMessageModal = (item) => {
    setSelected(item);
    setMsg("");
    setOpen(true);
  };

  const sendMessage = async () => {
    const listingId = selected ? getId(selected) : null;
    if (!listingId || !msg.trim()) return;

    setSending(true);
    try {
      const res = await api.post("tenant/booking-requests/create/", {
        listing_id: listingId,
        first_message: msg.trim(),
      });

      setToast({ type: "success", msg: "Message sent successfully." });
      setOpen(false);

      setNotifications((prev) => [
        {
          id: Date.now(),
          title: "New Message",
          message: "Your message has been sent. You can continue in the inbox.",
          type: "message",
          read: false,
          actionPath: "/tenant/inbox",
        },
        ...prev,
      ]);

      setInboxUnreadCount((prev) => prev + 1);
      nav(`/tenant/inbox?open=${res?.data?.id || ""}`);
    } catch (e) {
      setToast({ type: "error", msg: "Failed to send message." });
    } finally {
      setSending(false);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationToggle = () => {
    if (!notifOpen) {
      setNotifOpen(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } else {
      setNotifOpen(false);
    }
  };

  const handleNotificationClick = (item) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setNotifOpen(false);

    if (item?.actionPath) {
      nav(item.actionPath);
    }
  };

  const handleInboxOpen = () => {
    setInboxUnreadCount(0);
    nav("/tenant/inbox");
  };

  const pageBg = isDark
    ? "bg-[linear-gradient(180deg,#071120_0%,#0a1a30_45%,#0c2240_100%)]"
    : "bg-[linear-gradient(180deg,#f4f9ff_0%,#e8f2ff_55%,#ddeaff_100%)]";

  const cardClass = isDark
    ? "border border-white/10 bg-[#10294d]/95 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
    : "border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

  const mutedCardClass = isDark
    ? "border border-white/10 bg-[#0d223f]"
    : "border border-slate-200 bg-slate-50";

  const inputClass = isDark
    ? "bg-[#16345c] border-white/10 text-white placeholder:text-slate-400"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";

  const headingText = isDark ? "text-white" : "text-slate-900";
  const subText = isDark ? "text-slate-300" : "text-slate-600";

  const getSoftPanelClass = (tone = "blue") => {
    if (isDark) {
      const darkMap = {
        blue: "border border-blue-400/20 bg-[linear-gradient(180deg,rgba(59,130,246,0.22),rgba(16,41,77,0.97))]",
        pink: "border border-pink-400/20 bg-[linear-gradient(180deg,rgba(236,72,153,0.2),rgba(16,41,77,0.97))]",
        green: "border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(16,41,77,0.97))]",
        violet: "border border-violet-400/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.2),rgba(16,41,77,0.97))]",
        amber: "border border-amber-400/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.2),rgba(16,41,77,0.97))]",
        cyan: "border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,182,212,0.2),rgba(16,41,77,0.97))]",
      };
      return darkMap[tone] || darkMap.blue;
    }

    const lightMap = {
      blue: "border border-blue-200 bg-[linear-gradient(180deg,#ffffff_0%,#dfeeff_100%)]",
      pink: "border border-pink-200 bg-[linear-gradient(180deg,#ffffff_0%,#ffe2ef_100%)]",
      green: "border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#dcfcef_100%)]",
      violet: "border border-violet-200 bg-[linear-gradient(180deg,#ffffff_0%,#ece6ff_100%)]",
      amber: "border border-amber-200 bg-[linear-gradient(180deg,#ffffff_0%,#ffedd5_100%)]",
      cyan: "border border-cyan-200 bg-[linear-gradient(180deg,#ffffff_0%,#dff7ff_100%)]",
    };
    return lightMap[tone] || lightMap.blue;
  };

  const getSoftIconClass = (tone = "blue") => {
    if (isDark) {
      const darkMap = {
        blue: "bg-blue-500/22 text-blue-300",
        pink: "bg-pink-500/22 text-pink-300",
        green: "bg-emerald-500/22 text-emerald-300",
        violet: "bg-violet-500/22 text-violet-300",
        amber: "bg-amber-500/22 text-amber-300",
        cyan: "bg-cyan-500/22 text-cyan-300",
      };
      return darkMap[tone] || darkMap.blue;
    }

    const lightMap = {
      blue: "bg-blue-100 text-blue-700",
      pink: "bg-pink-100 text-pink-700",
      green: "bg-emerald-100 text-emerald-700",
      violet: "bg-violet-100 text-violet-700",
      amber: "bg-amber-100 text-amber-700",
      cyan: "bg-cyan-100 text-cyan-700",
    };
    return lightMap[tone] || lightMap.blue;
  };

  const notificationTone = (type) => {
    if (type === "accepted") return "green";
    if (type === "message") return "blue";
    if (type === "expense") return "amber";
    if (type === "report") return "violet";
    return "cyan";
  };

  const notificationIcon = (type) => {
    if (type === "accepted") return CheckCircle2;
    if (type === "message") return MessageSquare;
    if (type === "expense") return WalletCards;
    if (type === "report") return BarChart3;
    return Bell;
  };

  const QuickAction = ({ icon: Icon, label, subtitle, onClick, tone = "blue" }) => (
    <button
      onClick={onClick}
      className={`group flex h-full min-h-[128px] flex-col justify-between rounded-3xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${getSoftPanelClass(
        tone
      )}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getSoftIconClass(
            tone
          )}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight
          className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        />
      </div>

      <div>
        <h3 className={`text-sm font-extrabold tracking-wide ${headingText}`}>{label}</h3>
        <p className={`mt-1 text-xs leading-5 ${subText}`}>{subtitle}</p>
      </div>
    </button>
  );

  const StatCard = ({ label, value, icon: Icon, accent }) => {
    return (
      <div
        className={`rounded-3xl p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ${getSoftPanelClass(
          accent
        )}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${subText}`}>
              {label}
            </p>
            <h3 className={`mt-2 text-3xl font-black tracking-tight ${headingText}`}>
              {value}
            </h3>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getSoftIconClass(
              accent
            )}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Shell
      title="Tenant Dashboard"
      subtitle={`Welcome back, ${username}. Manage listings, favorites, booking requests, and tenant tools.`}
      right={
        <div className="relative flex items-center gap-3" ref={notifRef}>
          <button
            onClick={handleInboxOpen}
            className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              isDark
                ? "bg-white/10 text-slate-200 hover:bg-blue-500/20 hover:text-white"
                : "bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700"
            }`}
          >
            <Inbox className="h-4 w-4" />
            Inbox
            {inboxUnreadCount > 0 && (
              <span className="ml-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                {inboxUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleNotificationToggle}
            className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              isDark
                ? "bg-white/10 text-slate-200 hover:bg-amber-500/20 hover:text-white"
                : "bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-700"
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
            {unreadNotifCount > 0 && (
              <span className="ml-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              isDark
                ? "bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-white"
                : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
            }`}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          {notifOpen && (
            <div
              className={`absolute right-0 top-[58px] z-50 w-[380px] overflow-hidden rounded-3xl border shadow-2xl ${
                isDark
                  ? "border-white/10 bg-[#10294d]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b px-5 py-4 ${
                  isDark ? "border-white/10" : "border-slate-200"
                }`}
              >
                <div>
                  <h3 className={`text-sm font-black ${headingText}`}>Notifications</h3>
                  <p className={`mt-1 text-xs ${subText}`}>
                    Latest updates for chat, request, and reports
                  </p>
                </div>

                <button
                  onClick={markAllNotificationsRead}
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto p-3">
                {notifications.length === 0 ? (
                  <div
                    className={`rounded-2xl px-4 py-6 text-center text-sm ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    No notifications available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((item) => {
                      const Icon = notificationIcon(item.type);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isDark
                              ? "border-white/10 bg-white/5 hover:bg-white/10"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div
                              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${getSoftIconClass(
                                notificationTone(item.type)
                              )}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className={`text-sm font-bold ${headingText}`}>
                                  {item.title}
                                </h4>
                                {!item.read && (
                                  <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                                )}
                              </div>
                              <p className={`mt-1 text-xs leading-5 ${subText}`}>
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      }
    >
      <div className={`min-h-screen w-full transition-colors duration-300 ${pageBg}`}>
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6 xl:px-8 2xl:px-10">
          {toast.msg && (
            <div
              className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                toast.type === "success"
                  ? isDark
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : toast.type === "error"
                  ? isDark
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-red-100 bg-red-50 text-red-700"
                  : isDark
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }`}
            >
              <Info className="h-4 w-4" />
              {toast.msg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className={`rounded-[32px] p-7 ${cardClass}`}>
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-blue-600">
                    Smart Rental House Finder
                  </p>
                  <h1 className={`text-3xl font-black leading-tight xl:text-4xl ${headingText}`}>
                    Find the right room, faster and more professionally
                  </h1>
                  <p className={`mt-3 max-w-2xl text-sm leading-6 ${subText}`}>
                    Search listings, message owners, manage saved properties, and
                    access your tenant tools from one clean dashboard.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => nav("/tenant/ai")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Finder
                  </button>

                  <button
                    onClick={() => nav("/map")}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                      isDark
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    Map Search
                  </button>
                </div>
              </div>

              <div
                className={`mt-6 rounded-[28px] p-5 ${
                  isDark
                    ? "border border-white/10 bg-[linear-gradient(180deg,#123158_0%,#102a4d_100%)]"
                    : "border border-blue-200 bg-[linear-gradient(180deg,#ffffff_0%,#dcecff_100%)]"
                }`}
              >
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search by property title, city, area, or keywords..."
                      className={`h-14 w-full rounded-2xl border pl-11 pr-4 text-sm font-medium outline-none transition focus:border-blue-500 ${inputClass}`}
                    />
                  </div>

                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className={`h-14 rounded-2xl border px-4 text-sm font-bold outline-none transition focus:border-blue-500 ${inputClass}`}
                  >
                    <option value="any">All Budgets</option>
                    <option value="lt5000">Under Rs 5,000</option>
                    <option value="5000_10000">Rs 5,000 - 10,000</option>
                    <option value="gt10000">Above Rs 10,000</option>
                  </select>

                  <button
                    onClick={fetchListings}
                    className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition ${
                      isDark
                        ? "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-white"
                        : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 hover:text-cyan-800"
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Saved" value={favorites.length} icon={Heart} accent="pink" />
              <StatCard label="All Listings" value={listings.length} icon={Home} accent="blue" />
              <StatCard label="Visible" value={filteredListings.length} icon={Search} accent="green" />
              <StatCard label="Inbox" value={inboxUnreadCount} icon={MessageSquare} accent="violet" />
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Quick Access
                </p>
                <h2 className={`mt-1 text-2xl font-black tracking-tight ${headingText}`}>
                  Tenant Tools Hub
                </h2>
              </div>

              <button
                onClick={() =>
                  setToast({
                    type: "info",
                    msg: `${favorites.length} properties currently saved.`,
                  })
                }
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  isDark
                    ? "bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 hover:text-white"
                    : "bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
                }`}
              >
                View saved count
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
              <QuickAction
                icon={MapPin}
                label="Map Search"
                subtitle="Browse properties by location"
                tone="blue"
                onClick={() => nav("/map")}
              />
              <QuickAction
                icon={Users}
                label="Roommates"
                subtitle="Find shared flat matches"
                tone="violet"
                onClick={() => nav("/tenant/roommates")}
              />
              <QuickAction
                icon={Sofa}
                label="Virtual Furniture"
                subtitle="Preview room arrangement"
                tone="pink"
                onClick={() => nav("/tenant/virtual-furniture")}
              />
              <QuickAction
                icon={Calculator}
                label="Budget Split"
                subtitle="Split rent and bills quickly"
                tone="amber"
                onClick={() => nav("/tools/budget-split")}
              />
              <QuickAction
                icon={Wallet}
                label="Expenses"
                subtitle="Track your rental spending"
                tone="green"
                onClick={() => nav("/tenant/expenses")}
              />
              <QuickAction
                icon={CreditCard}
                label="Payments"
                subtitle="See booking payment status"
                tone="cyan"
                onClick={() => nav("/tenant/booking-payments")}
              />
              <QuickAction
                icon={Heart}
                label="Saved Items"
                subtitle="Access your favorite listings"
                tone="pink"
                onClick={() =>
                  setToast({
                    type: "info",
                    msg: `${favorites.length} properties currently saved.`,
                  })
                }
              />
              <QuickAction
                icon={Inbox}
                label="Inbox"
                subtitle="Open your owner conversations"
                tone="violet"
                onClick={handleInboxOpen}
              />
            </div>
          </div>

          <div className="mt-10">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Property Listings
                </p>
                <h2 className={`mt-1 text-2xl font-black tracking-tight ${headingText}`}>
                  Available Residences
                </h2>
              </div>

              <button
                onClick={fetchListings}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  isDark
                    ? "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-white"
                    : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 hover:text-cyan-800"
                }`}
              >
                Refresh listings
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-[430px] animate-pulse rounded-[28px] ${
                      isDark ? "bg-[#10294d]" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            ) : error ? (
              <div
                className={`rounded-3xl border p-8 ${
                  isDark
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                <div className="flex items-center gap-2 text-base font-bold">
                  <Info className="h-5 w-5" />
                  {error}
                </div>
              </div>
            ) : featuredListings.length === 0 ? (
              <div
                className={`flex h-64 flex-col items-center justify-center rounded-[30px] border border-dashed ${
                  isDark
                    ? "border-white/10 bg-[#0d223f] text-slate-400"
                    : "border-slate-300 bg-slate-50 text-slate-500"
                }`}
              >
                <Info className="mb-3 h-10 w-10 opacity-30" />
                <p className="font-medium">No listings match your current filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {featuredListings.map((item) => {
                  const id = getId(item);
                  const rent = getRent(item);

                  return (
                    <div
                      key={id}
                      className={`group overflow-hidden rounded-[30px] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${cardClass}`}
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={toImageSrc(getImage(item))}
                          alt={getTitle(item)}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        <div className="absolute left-4 top-4">
                          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                            {getType(item)}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleFavorite(item)}
                          className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full transition ${
                            isFav(item)
                              ? "bg-red-500 text-white"
                              : "bg-white/90 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isFav(item) ? "fill-current" : ""}`} />
                        </button>

                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="line-clamp-1 text-xl font-black text-white">
                            {getTitle(item)}
                          </h3>
                          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-white/85">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="line-clamp-1">{getAddress(item)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex min-h-[230px] flex-col p-5">
                        <div className="mb-3 flex items-end justify-between gap-3">
                          <div>
                            <div className={`text-2xl font-black tracking-tight ${headingText}`}>
                              Rs {currency(rent)}
                            </div>
                            <div className={`text-xs font-bold uppercase tracking-[0.16em] ${subText}`}>
                              Per month
                            </div>
                          </div>
                        </div>

                        <p className={`mb-5 line-clamp-3 text-sm leading-6 ${subText}`}>
                          {getDescription(item)}
                        </p>

                        <div className="mt-auto space-y-3">
                          <button
                            onClick={() => nav(`/public/listings/${id}`)}
                            className={`w-full rounded-2xl py-3 text-sm font-bold transition ${
                              isDark
                                ? "bg-white/10 text-white hover:bg-white/15"
                                : "bg-slate-900 text-white hover:bg-black"
                            }`}
                          >
                            View Full Details
                          </button>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => openMessageModal(item)}
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition ${
                                isDark
                                  ? "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              }`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              Message
                            </button>

                            <button
                              onClick={() => nav(`/tenant/book/${id}`)}
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition ${
                                isDark
                                  ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-white"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              }`}
                            >
                              <Calendar className="h-4 w-4" />
                              Book
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {open && selected && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className={`w-full max-w-2xl overflow-hidden rounded-[32px] shadow-2xl ${
                isDark ? "border border-white/10 bg-[#10294d]" : "bg-white"
              }`}
            >
              <div
                className={`relative border-b px-7 py-6 ${
                  isDark ? "border-white/10" : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => setOpen(false)}
                  className={`absolute right-6 top-6 ${
                    isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>

                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
                  Contact Property Owner
                </p>
                <h3 className={`text-2xl font-black ${headingText}`}>{getTitle(selected)}</h3>
                <p className={`mt-1 text-sm ${subText}`}>{getAddress(selected)}</p>
              </div>

              <div className="space-y-6 p-7">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-2xl p-4 ${mutedCardClass}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${subText}`}>
                      Owner
                    </p>
                    <p className={`mt-2 text-sm font-bold ${headingText}`}>
                      {selected?.owner_name || "Verified Landlord"}
                    </p>
                  </div>

                  <div className={`rounded-2xl p-4 ${mutedCardClass}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${subText}`}>
                      Monthly Rent
                    </p>
                    <p className="mt-2 text-sm font-bold text-blue-600">
                      Rs {currency(getRent(selected))}
                    </p>
                  </div>
                </div>

                <div>
                  <label className={`mb-2 block text-[10px] font-black uppercase tracking-[0.18em] ${subText}`}>
                    Your Message
                  </label>
                  <textarea
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Introduce yourself, mention your move-in date, budget, and any important details..."
                    className={`h-36 w-full rounded-2xl border p-4 text-sm font-medium outline-none transition focus:border-blue-500 ${inputClass}`}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={sendMessage}
                    disabled={sending || !msg.trim()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => nav(`/tenant/book/${getId(selected)}`)}
                    className={`flex-1 rounded-2xl px-5 py-3.5 text-sm font-bold transition ${
                      isDark
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    Go to Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}