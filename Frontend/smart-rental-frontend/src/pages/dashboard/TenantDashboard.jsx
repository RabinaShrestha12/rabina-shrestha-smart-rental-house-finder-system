import {
  ArrowRight,
  BarChart3,
  Bell,
  Calculator,
  Calendar,
  CheckCircle2,
  CreditCard,
  Droplets,
  FileText,
  Heart,
  Home,
  Info,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Sofa,
  Sparkles,
  Users,
  Wallet,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";

const BACKEND = "http://127.0.0.1:8000";
const TENANT_NOTIFICATIONS_KEY = "tenant_dashboard_notifications_v1";

const DEFAULT_NOTIFICATIONS = [
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
    message: "You received a new message in your chat.",
    type: "message",
    read: false,
    actionPath: "/tenant/inbox",
  },
  {
    id: 3,
    title: "Roommate Request",
    message: "A new roommate request has been received. Review the details and respond.",
    type: "roommate",
    read: false,
    actionPath: "/tenant/roommates/requests",
  },
  {
    id: 4,
    title: "Monthly Expense Tracking",
    message: "Your monthly expense tracker summary is ready. Review the latest totals.",
    type: "expense",
    read: false,
    actionPath: "/tenant/expenses",
  },
  {
    id: 5,
    title: "Payment Completed",
    message: "Your rent payment has been processed successfully. View payment details.",
    type: "payment",
    read: false,
    actionPath: "/tenant/booking-payments",
  },
  {
    id: 6,
    title: "Rent Payment Reminder",
    message: "Monthly rent is due on the 1st. Please pay on time to avoid penalties.",
    type: "rent",
    read: false,
    actionPath: "/tenant/booking-payments",
  },
  {
    id: 7,
    title: "Water Bill Due",
    message: "Your water bill is due this month. Check your account for details and pay online.",
    type: "water",
    read: false,
    actionPath: "/tenant/expenses",
  },
  {
    id: 8,
    title: "Electricity Bill Due",
    message:
      "Your electricity bill is due this month. Pay before the deadline to maintain your connection.",
    type: "electricity",
    read: false,
    actionPath: "/tenant/expenses",
  },
];

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

function loadTenantNotifications() {
  try {
    const raw = localStorage.getItem(TENANT_NOTIFICATIONS_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
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

  const [notifications, setNotifications] = useState(() => loadTenantNotifications());
  const [notifOpen, setNotifOpen] = useState(false);

  const [inboxUnreadCount, setInboxUnreadCount] = useState(() => {
    try {
      const saved = localStorage.getItem("tenant_inbox_unread_counts");
      const unreadMap = saved ? JSON.parse(saved) : {};
      return Object.values(unreadMap || {}).reduce(
        (sum, count) => sum + Number(count || 0),
        0
      );
    } catch {
      return 0;
    }
  });

  const [unreadRoommateCount, setUnreadRoommateCount] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(TENANT_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const fetchRoommateUnread = async () => {
    try {
      const res = await api.get("tenant/roommates/chats/");
      const list = Array.isArray(res?.data?.results)
        ? res.data.results
        : Array.isArray(res?.data)
        ? res.data
        : [];
      const total = list.reduce((sum, t) => sum + Number(t.unread_count || 0), 0);
      setUnreadRoommateCount(total);
    } catch (err) {
      console.log("Error fetching roommate unread count:", err);
    }
  };

  const fetchInboxUnread = async () => {
    try {
      const res = await api.get("tenant/booking-requests/");
      const list = Array.isArray(res?.data?.results)
        ? res.data.results
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const lastSeenRaw = localStorage.getItem("tenant_inbox_last_seen");
      const lastSeenMap = lastSeenRaw ? JSON.parse(lastSeenRaw) : {};
      const newUnreadMap = {};

      await Promise.all(
        list.map(async (b) => {
          const bid = b.id || b.pk;
          if (!bid) return;
          try {
            const mres = await api.get(`booking-requests/${bid}/messages/`);
            const messages = Array.isArray(mres.data)
              ? mres.data
              : mres.data?.results || [];

            const ownerMsg = messages.filter(
              (m) => (m.sender_role || "").toLowerCase() !== "tenant"
            );

            if (ownerMsg.length === 0) {
              newUnreadMap[bid] = 0;
              return;
            }

            const latest = [...ownerMsg].sort(
              (x, y) =>
                new Date(y.created_at || 0).getTime() -
                new Date(x.created_at || 0).getTime()
            )[0];

            const seen = lastSeenMap[bid];
            const isNew =
              !seen ||
              (latest.id && String(latest.id) !== String(seen.last_seen_id)) ||
              (latest.created_at &&
                String(latest.created_at) !== String(seen.last_seen_at));

            newUnreadMap[bid] = isNew ? 1 : 0;
          } catch {
            newUnreadMap[bid] = 0;
          }
        })
      );

      localStorage.setItem(
        "tenant_inbox_unread_counts",
        JSON.stringify(newUnreadMap)
      );
      const total = Object.values(newUnreadMap).reduce((s, c) => s + (c || 0), 0);
      setInboxUnreadCount(total);
    } catch (err) {
      console.log("Error fetching inbox unread count:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem("tenant_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem("tenant_inbox_unread_counts");
        const unreadMap = saved ? JSON.parse(saved) : {};
        const total = Object.values(unreadMap || {}).reduce(
          (sum, count) => sum + Number(count || 0),
          0
        );
        setInboxUnreadCount(total);
      } catch {}
    };

    const handleCustomEvent = () => {
      handleStorageChange();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("inboxUnreadUpdated", handleCustomEvent);

    fetchRoommateUnread();
    fetchInboxUnread();

    const interval = setInterval(() => {
      handleStorageChange();
      fetchRoommateUnread();
      fetchInboxUnread();
    }, 10000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("inboxUnreadUpdated", handleCustomEvent);
      clearInterval(interval);
    };
  }, []);

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

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  const safeArr = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getId = (item) => item?.id ?? item?.pk ?? item?.listing_id ?? item?.property_id;
  const getTitle = (x) => x?.title || x?.property_name || x?.name || "Property";
  const getAddress = (x) => x?.address || x?.location || x?.city || x?.area || "Nepal";

  const getRent = (x) => {
    if (x?.price_per_month) return x.price_per_month;
    if (x?.rent) return x.rent;
    if (x?.price) return x.price;
    if (x?.monthly_rent) return x.monthly_rent;
    if (x?.price_per_week) return Number(x.price_per_week) * 4.345;
    return null;
  };

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

  const isBooked = (item) => {
    if (item?.is_available === false || item?.available === false) return true;
    const s = String(
      item?.status ??
      item?.booking_status ??
      item?.property_status ??
      ""
    ).toLowerCase();
    return s === "booked" || s === "occupied" || s === "rented";
  };

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
    } catch {
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

  const featuredListings = useMemo(
    () => filteredListings.slice(0, 8),
    [filteredListings]
  );

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

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
          message: "Your message has been sent. You can start chatting.",
          type: "message",
          read: false,
          actionPath: "/tenant/inbox",
        },
        ...prev,
      ]);

      nav(`/tenant/inbox?open=${res?.data?.id || ""}`);
    } catch {
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
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotifOpen(true);
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
    ? "bg-[linear-gradient(180deg,#13233d_0%,#0d1b34_55%,#081428_100%)]"
    : "bg-[linear-gradient(180deg,#f4f9ff_0%,#e8f2ff_55%,#ddeaff_100%)]";

  const cardClass = isDark
    ? "border border-[#325886] bg-[linear-gradient(180deg,#1a2f52_0%,#101f3d_100%)] shadow-[0_18px_42px_rgba(0,0,0,0.28)]"
    : "border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

  const mutedCardClass = isDark
    ? "border border-[#3b5f8e] bg-[#163257]"
    : "border border-slate-200 bg-slate-50";

  const inputClass = isDark
    ? "bg-[#16345c] border-[#31547e] text-white placeholder:text-slate-300"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";

  const headingText = isDark ? "text-white" : "text-slate-900";
  const subText = isDark ? "text-slate-200" : "text-slate-600";

  const softTextHeading = isDark ? "text-slate-900" : "text-slate-900";
  const softTextSub = isDark ? "text-slate-700" : "text-slate-600";

  const getSoftPanelClass = (tone = "blue") => {
    if (isDark) {
      const darkMap = {
        blue: "border border-[#7fb6ff]/45 bg-[linear-gradient(180deg,#f4f8ff_0%,#dfeeff_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
        pink: "border border-[#f2b8d2]/50 bg-[linear-gradient(180deg,#fff7fb_0%,#ffe2ef_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
        green: "border border-[#9ee6c1]/50 bg-[linear-gradient(180deg,#f3fff8_0%,#dcfcef_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
        violet: "border border-[#c7b6ff]/50 bg-[linear-gradient(180deg,#faf8ff_0%,#ece6ff_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
        amber: "border border-[#f6d58f]/55 bg-[linear-gradient(180deg,#fffaf0_0%,#ffedd5_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
        cyan: "border border-[#9fdef2]/55 bg-[linear-gradient(180deg,#f4fdff_0%,#dff7ff_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
        emerald: "border border-[#9ee6c1]/50 bg-[linear-gradient(180deg,#f3fff8_0%,#dcfcef_100%)] shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:brightness-[0.98]",
      };
      return darkMap[tone] || darkMap.blue;
    }

    const lightMap = {
      blue: "border border-blue-200 bg-[linear-gradient(180deg,#ffffff_0%,#dfeeff_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#d4e7ff_100%)]",
      pink: "border border-pink-200 bg-[linear-gradient(180deg,#ffffff_0%,#ffe2ef_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#ffd8e9_100%)]",
      green: "border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#dcfcef_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#d2f8e8_100%)]",
      violet: "border border-violet-200 bg-[linear-gradient(180deg,#ffffff_0%,#ece6ff_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#e3dbff_100%)]",
      amber: "border border-amber-200 bg-[linear-gradient(180deg,#ffffff_0%,#ffedd5_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#ffe5c0_100%)]",
      cyan: "border border-cyan-200 bg-[linear-gradient(180deg,#ffffff_0%,#dff7ff_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#d1f3ff_100%)]",
      emerald: "border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#dcfcef_100%)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#d2f8e8_100%)]",
    };
    return lightMap[tone] || lightMap.blue;
  };

  const getSoftIconClass = (tone = "blue") => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-700",
      pink: "bg-pink-100 text-pink-700",
      green: "bg-emerald-100 text-emerald-700",
      violet: "bg-violet-100 text-violet-700",
      amber: "bg-amber-100 text-amber-700",
      cyan: "bg-cyan-100 text-cyan-700",
      emerald: "bg-emerald-100 text-emerald-700",
    };
    return colorMap[tone] || colorMap.blue;
  };

  const notificationTone = (type) => {
    if (type === "accepted") return "green";
    if (type === "message") return "blue";
    if (type === "roommate") return "violet";
    if (type === "expense") return "amber";
    if (type === "payment") return "green";
    if (type === "rent") return "amber";
    if (type === "water") return "cyan";
    if (type === "electricity") return "amber";
    if (type === "report") return "cyan";
    return "cyan";
  };

  const notificationIcon = (type) => {
    if (type === "accepted") return CheckCircle2;
    if (type === "message") return MessageSquare;
    if (type === "roommate") return Users;
    if (type === "expense") return WalletCards;
    if (type === "payment") return CreditCard;
    if (type === "rent") return Wallet;
    if (type === "water") return Droplets;
    if (type === "electricity") return Zap;
    if (type === "report") return BarChart3;
    return Bell;
  };

  const QuickAction = ({ icon: Icon, label, subtitle, onClick, tone = "blue", badge = 0 }) => (
    <button
      onClick={onClick}
      className={`group relative flex h-full min-h-[128px] flex-col justify-between rounded-3xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${getSoftPanelClass(
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

        <div className="relative">
          <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1" />
          {badge > 0 && (
            <span className="absolute -right-2 -top-3 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
              {badge}
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-extrabold tracking-wide ${softTextHeading}`}>
          {label}
        </h3>
        <p className={`mt-1 text-xs leading-5 ${softTextSub}`}>
          {subtitle}
        </p>
      </div>
    </button>
  );

  const StatCard = ({ label, value, icon: Icon, accent }) => {
    return (
      <div
        className={`rounded-3xl p-5 ${getSoftPanelClass(
          accent
        )}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${softTextSub}`}>
              {label}
            </p>
            <h3 className={`mt-2 text-3xl font-black tracking-tight ${softTextHeading}`}>
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
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            isDark
              ? "bg-red-500/10 text-red-200 hover:bg-red-500/18 hover:text-red-100 border border-red-300/20"
              : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          }`}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      }
    >
      <div className={`min-h-screen w-full transition-colors duration-300 ${pageBg}`}>
        <div className="mx-auto w-full max-w-[1600px] px-6 pt-2 pb-6 xl:px-8 2xl:px-10">
          {toast.msg && (
            <div
              className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                toast.type === "success"
                  ? isDark
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : toast.type === "error"
                  ? isDark
                    ? "border-red-400/30 bg-red-500/10 text-red-200"
                    : "border-red-100 bg-red-50 text-red-700"
                  : isDark
                  ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
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
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-blue-400">
                    Smart Rental House Finder
                  </p>
                  <h1 className={`text-3xl font-black leading-tight xl:text-4xl ${headingText}`}>
                    Find the right room, faster and more professionally
                  </h1>
                  <p className={`mt-3 max-w-2xl text-sm leading-6 ${subText}`}>
                    Search listings, message owners, manage saved properties, and access your tenant tools from one clean dashboard.
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
                        ? "bg-white/10 text-white hover:bg-white/15 border border-white/10"
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
                    ? "border border-[#3b5f8e] bg-[linear-gradient(180deg,#173963_0%,#143257_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
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
                    <option value="5000_10000">Rs 5,000 - Rs 10,000</option>
                    <option value="gt10000">Above Rs 10,000</option>
                  </select>

                  <button
                    onClick={fetchListings}
                    className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition ${
                      isDark
                        ? "bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/28 hover:text-white border border-cyan-300/20"
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
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
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
                    ? "bg-violet-500/20 text-violet-100 hover:bg-violet-500/28 hover:text-white border border-violet-300/20"
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
                icon={MessageSquare}
                label="Roommate Chat"
                subtitle="Message matched roommates"
                tone="emerald"
                onClick={() => nav("/tenant/roommates/chats")}
                badge={unreadRoommateCount}
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
                icon={Bell}
                label="Notifications"
                subtitle="View latest updates"
                tone="amber"
                onClick={handleNotificationToggle}
                badge={unreadNotifCount}
              />

              <QuickAction
                icon={Wallet}
                label="Expenses"
                subtitle="Track your rental spending"
                tone="green"
                onClick={() => nav("/tenant/expenses")}
              />



              <QuickAction
                icon={FileText}
                label="Rental Contracts"
                subtitle="View and respond to owner rental contracts"
                tone="cyan"
                onClick={() => nav("/tenant/contracts")}
              />

              <QuickAction
                icon={MessageSquare}
                label="Chat"
                subtitle="Open your owner conversations"
                tone="violet"
                badge={inboxUnreadCount}
                onClick={handleInboxOpen}
              />
            </div>

            {notifOpen && (
              <div
                className={`mt-6 rounded-[28px] border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${
                  isDark ? "border-[#3b5f8e] bg-[#123159]" : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
                      Notifications Panel
                    </p>
                    <h3 className={`mt-1 text-xl font-black ${headingText}`}>
                      Tenant Notifications
                    </h3>
                  </div>
                  <button
                    onClick={markAllNotificationsRead}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="grid gap-3">
                  {notifications.length === 0 ? (
                    <div
                      className={`rounded-2xl px-4 py-6 text-center text-sm ${
                        isDark ? "text-slate-200" : "text-slate-600"
                      }`}
                    >
                      No notifications available.
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const Icon = notificationIcon(item.type);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isDark
                              ? "border-[#3b5f8e] bg-white/5 hover:bg-white/10"
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
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
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
                    ? "bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/28 hover:text-white border border-cyan-300/20"
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
                      isDark ? "bg-[#123159]" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            ) : error ? (
              <div
                className={`rounded-3xl border p-8 ${
                  isDark
                    ? "border-red-400/30 bg-red-500/10 text-red-200"
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
                    ? "border-[#3b5f8e] bg-[#10284a] text-slate-200"
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
                  const booked = isBooked(item);

                  return (
                    <div
                      key={id}
                      className={`group overflow-hidden rounded-[30px] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${cardClass} ${
                        booked ? "opacity-95" : ""
                      }`}
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={toImageSrc(getImage(item))}
                          alt={getTitle(item)}
                          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            booked ? "grayscale-[15%]" : ""
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                            {getType(item)}
                          </span>

                          {booked && (
                            <span className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow">
                              Booked
                            </span>
                          )}
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

                          {booked && (
                            <div
                              className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                                isDark
                                  ? "bg-red-500/15 text-red-200 border border-red-300/20"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              Already booked
                            </div>
                          )}
                        </div>

                        <p className={`mb-5 line-clamp-3 text-sm leading-6 ${subText}`}>
                          {getDescription(item)}
                        </p>

                        <div className="mt-auto space-y-3">
                          <button
                            onClick={() => nav(`/public/listings/${id}`)}
                            className={`w-full rounded-2xl py-3 text-sm font-bold transition ${
                              isDark
                                ? "bg-white/10 text-white hover:bg-white/15 border border-white/10"
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
                                  ? "bg-blue-500/10 text-blue-200 hover:bg-blue-500/18 hover:text-white border border-blue-300/20"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                              }`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              Message
                            </button>

                            <button
                              onClick={() => {
                                if (!booked) nav(`/tenant/book/${id}`);
                              }}
                              disabled={booked}
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition ${
                                booked
                                  ? isDark
                                    ? "cursor-not-allowed bg-red-500/12 text-red-200 opacity-85 border border-red-300/20"
                                    : "cursor-not-allowed bg-red-50 text-red-500 opacity-90"
                                  : isDark
                                  ? "bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/18 hover:text-white border border-emerald-300/20"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              }`}
                            >
                              <Calendar className="h-4 w-4" />
                              {booked ? "Booked" : "Book"}
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
                isDark ? "border border-[#3b5f8e] bg-[#123159]" : "bg-white"
              }`}
            >
              <div
                className={`relative border-b px-7 py-6 ${
                  isDark ? "border-[#3b5f8e]" : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => setOpen(false)}
                  className={`absolute right-6 top-6 ${
                    isDark ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>

                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-400">
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
                    <p className="mt-2 text-sm font-bold text-blue-400">
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
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                    onClick={() => {
                      if (!isBooked(selected)) {
                        nav(`/tenant/book/${getId(selected)}`);
                      }
                    }}
                    disabled={isBooked(selected)}
                    className={`flex-1 rounded-2xl px-5 py-3.5 text-sm font-bold transition ${
                      isBooked(selected)
                        ? isDark
                          ? "cursor-not-allowed bg-red-500/12 text-red-200 opacity-85 border border-red-300/20"
                          : "cursor-not-allowed bg-red-50 text-red-500 opacity-90"
                        : isDark
                        ? "bg-white/10 text-white hover:bg-white/16 hover:text-white border border-white/10"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {isBooked(selected) ? "Already Booked" : "Go to Booking"}
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