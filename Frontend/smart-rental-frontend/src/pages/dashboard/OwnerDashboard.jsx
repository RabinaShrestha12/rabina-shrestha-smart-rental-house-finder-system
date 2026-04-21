import {
  ArrowLeft,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LogOut,
  MapPin,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Star,
  UserRound,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import LocationPicker from "../../components/LocationPicker";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import Toast from "../../components/Toast";

function kmOrM(meters) {
  if (meters == null || Number.isNaN(Number(meters))) return "";
  const m = Number(meters);
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function formatDate(s) {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

export default function OwnerDashboard() {
  const { role, email, logout, booting } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigate();
  const isDark = theme === "dark";

  const storedUser = useMemo(() => readStoredUser(), []);
  const displayEmail =
    email ||
    storedUser?.email ||
    localStorage.getItem("email") ||
    storedUser?.username ||
    "Owner";

  const bookingSeenKey = useMemo(
    () => `owner_seen_bookings_${displayEmail || "owner"}`,
    [displayEmail]
  );

  const reviewSeenKey = useMemo(
    () => `owner_seen_reviews_${displayEmail || "owner"}`,
    [displayEmail]
  );

  const paymentSeenKey = useMemo(
    () => `owner_seen_payments_${displayEmail || "owner"}`,
    [displayEmail]
  );

  const ui = {
    pageBg: isDark
      ? "bg-[linear-gradient(180deg,#071120_0%,#0a1a30_45%,#0c2240_100%)]"
      : "bg-[linear-gradient(180deg,#f6f8fc_0%,#eef3f9_100%)]",
    card: isDark
      ? "border border-white/10 bg-[#10294d]/95 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
      : "border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
    soft: isDark
      ? "border border-white/10 bg-[#0d223f]"
      : "border border-slate-200 bg-slate-50",
    input: isDark
      ? "bg-[#16345c] border-white/10 text-white placeholder:text-slate-400"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
    heading: isDark ? "text-white" : "text-slate-900",
    sub: isDark ? "text-slate-300" : "text-slate-600",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    badgeBlue: isDark
      ? "border-blue-500/20 bg-blue-500/10 text-blue-100"
      : "border-blue-200 bg-blue-50 text-blue-700",
    badgeAmber: isDark
      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-700",
    badgePurple: isDark
      ? "border-purple-500/20 bg-purple-500/10 text-purple-100"
      : "border-purple-200 bg-purple-50 text-purple-700",
    badgeGreen: isDark
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-700",
    smallAction: isDark
      ? "border border-white/10 bg-[#0d223f] text-slate-200 hover:bg-[#16345c]"
      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
  };

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [profile, setProfile] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [activeTopPanel, setActiveTopPanel] = useState(null); // reviews | notifications | payments

  const [requests, setRequests] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  const [notifQuery, setNotifQuery] = useState("");

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  const [seenBookingIds, setSeenBookingIds] = useState([]);
  const [seenReviewIds, setSeenReviewIds] = useState([]);
  const [seenPaymentIds, setSeenPaymentIds] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "house",
    location: "",
    price_per_month: "",
    electricity_bill: "",
    owner_contact_number: "",
    owner_contact_email: "",
    latitude: "",
    longitude: "",
  });

  const [picked, setPicked] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [pano, setPano] = useState({
    front: null,
    back: null,
    left: null,
    right: null,
    up: null,
    down: null,
  });

  const [posting, setPosting] = useState(false);

  const [geoLoading, setGeoLoading] = useState(false);
  const [place, setPlace] = useState({
    display: "",
    road: "",
    suburb: "",
    city: "",
    state: "",
    country: "",
    postcode: "",
  });

  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [radius, setRadius] = useState(1200);
  const [nearby, setNearby] = useState({
    schools: [],
    colleges: [],
    hospitals: [],
    markets: [],
    bus: [],
    atms: [],
  });

  const inFlightRef = useRef({ nominatim: null, overpass: null });
  const notifToastTimerRef = useRef(null);
  const reviewToastTimerRef = useRef(null);

  const notifInitRef = useRef(false);
  const seenNotifIdsRef = useRef(new Set());

  const reviewInitRef = useRef(false);
  const seenReviewIdsRef = useRef(new Set());

  const addPropertyRef = useRef(null);
  const reviewsRef = useRef(null);
  const notificationsRef = useRef(null);
  const paymentsRef = useRef(null);
  const topPanelRef = useRef(null);

  const arrify = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const loadSeenIds = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveSeenIds = (key, ids) => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch { }
  };

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk;
  const getStatus = (b) => (b?.status ?? b?.state ?? "pending").toLowerCase();
  const getTenantEmail = (b) =>
    b?.tenant_email ||
    b?.tenant?.email ||
    b?.tenant_username ||
    b?.tenant?.username ||
    "Tenant";
  const getTenantName = (b) =>
    b?.tenant_name ||
    b?.tenant?.username ||
    b?.tenant?.name ||
    b?.tenant_username ||
    "Tenant";
  const getListingTitle = (b) =>
    b?.listing_title ||
    b?.listing?.title ||
    b?.property_title ||
    b?.property?.title ||
    "Property";
  const getFirstMessage = (b) =>
    b?.first_message || b?.message || b?.text || b?.latest_message || "";

  const getReviewId = (r, idx) => r?.id ?? r?.review_id ?? r?.pk ?? `${idx}`;
  const getReviewRating = (r) =>
    r?.rating ?? r?.stars ?? r?.score ?? r?.overall_rating ?? null;
  const getReviewComment = (r) =>
    r?.comment ?? r?.review ?? r?.message ?? r?.text ?? r?.feedback ?? "";
  const getReviewTenant = (r) =>
    r?.tenant_email ||
    r?.tenant?.email ||
    r?.tenant_username ||
    r?.tenant?.username ||
    r?.reviewer ||
    "Tenant";
  const getReviewListingTitle = (r) =>
    r?.listing_title ||
    r?.listing?.title ||
    r?.property_title ||
    r?.property?.title ||
    "Property";
  const getReviewCreatedAt = (r) =>
    r?.created_at || r?.created || r?.timestamp || r?.date || "";

  const starString = (rating) => {
    const n = Number(rating);
    if (Number.isNaN(n) || n <= 0) return "";
    const full = Math.max(0, Math.min(5, Math.round(n)));
    return "★".repeat(full) + "☆".repeat(5 - full);
  };

  const getNotifId = (n, idx = 0) =>
    n?.id ?? n?.notification_id ?? n?.pk ?? `${idx}`;
  const getNotifTitle = (n) =>
    n?.title ?? n?.subject ?? n?.type ?? "Notification";
  const getNotifBody = (n) =>
    n?.message ?? n?.body ?? n?.text ?? n?.detail ?? "";
  const getNotifCreatedAt = (n) =>
    n?.created_at || n?.created || n?.timestamp || n?.date || "";
  const getNotifLink = (n) => n?.link ?? n?.url ?? "";

  const getOwnerSafeNotifLink = (nOrLink) => {
    const raw = typeof nOrLink === "string" ? nOrLink : getNotifLink(nOrLink);
    const link = String(raw || "").trim();

    if (!link) return "";

    if (link.includes("/provider/chat/")) {
      const jobId = link.split("/provider/chat/")[1]?.split(/[/?#]/)[0];
      if (jobId) return `/owner/provider-chat/${jobId}`;
    }

    if (link.includes("/owner/maintenance/")) {
      const jobId = link.split("/owner/maintenance/")[1]?.split(/[/?#]/)[0];
      if (jobId) return `/owner/provider-chat/${jobId}`;
    }

    return link;
  };

  const isNotifUnread = (n) => {
    const v = n?.is_read ?? n?.read ?? n?.seen;
    if (v === undefined || v === null) return false;
    return !Boolean(v);
  };

  const getNotifKind = (n) => {
    const title = String(getNotifTitle(n) || "").toLowerCase();
    const body = String(getNotifBody(n) || "").toLowerCase();
    const link = String(getOwnerSafeNotifLink(n) || "").toLowerCase();

    if (
      title.includes("booking") ||
      body.includes("booking") ||
      body.includes("tenant") ||
      link.includes("/owner/messages") ||
      link.includes("/tenant/inbox")
    ) {
      return "booking";
    }

    if (
      title.includes("provider") ||
      title.includes("maintenance") ||
      body.includes("provider") ||
      body.includes("maintenance") ||
      body.includes("job") ||
      link.includes("/owner/maintenance") ||
      link.includes("/provider/chat") ||
      link.includes("/owner/provider-chat")
    ) {
      return "provider";
    }

    if (
      title.includes("review") ||
      body.includes("review") ||
      body.includes("rating")
    ) {
      return "review";
    }

    return "other";
  };

  const getNotifKindLabel = (n) => {
    const kind = getNotifKind(n);
    if (kind === "booking") return "Booking";
    if (kind === "provider") return "Provider";
    if (kind === "review") return "Review";
    return "General";
  };

  const getNotifKindClasses = (n) => {
    const kind = getNotifKind(n);
    if (kind === "booking") return ui.badgeBlue;
    if (kind === "provider") return ui.badgeGreen;
    if (kind === "review") return ui.badgeAmber;
    return ui.badgePurple;
  };

  const getNotifSender = (n) => {
    const body = String(getNotifBody(n) || "").trim();

    const patterns = [
      /^(.+?)\s+sent\b/i,
      /^(.+?)\s+updated\b/i,
      /^(.+?)\s+replied\b/i,
      /^(.+?)\s+accepted\b/i,
      /^(.+?)\s+rejected\b/i,
      /^(.+?)\s+requested\b/i,
    ];

    for (const p of patterns) {
      const m = body.match(p);
      if (m?.[1]) return m[1].trim();
    }

    if (getNotifKind(n) === "booking") return "Tenant";
    if (getNotifKind(n) === "provider") return "Service Provider";
    if (getNotifKind(n) === "review") return "Reviewer";
    return "Someone";
  };

  const getGroupedTitle = (group) => {
    if (group.kind === "booking") {
      return group.count === 1
        ? "New booking notification"
        : `${group.count} booking notifications`;
    }
    if (group.kind === "provider") {
      return group.count === 1
        ? "New service provider notification"
        : `${group.count} service provider notifications`;
    }
    if (group.kind === "review") {
      return group.count === 1
        ? "New review notification"
        : `${group.count} review notifications`;
    }
    return group.count === 1 ? "New notification" : `${group.count} notifications`;
  };

  const getGroupedBody = (group) => {
    if (group.kind === "booking") {
      return `${group.sender} sent ${group.count} booking notification${group.count > 1 ? "s" : ""
        } to you.`;
    }
    if (group.kind === "provider") {
      return `${group.sender} sent ${group.count} provider notification${group.count > 1 ? "s" : ""
        } to you.`;
    }
    if (group.kind === "review") {
      return `${group.sender} sent ${group.count} review notification${group.count > 1 ? "s" : ""
        } to you.`;
    }
    return `${group.sender} sent ${group.count} notification${group.count > 1 ? "s" : ""
      } to you.`;
  };

  const getPaymentId = (p, idx) => p?.id ?? p?.payment_id ?? p?.pk ?? `${idx}`;
  const getPaymentTenant = (p) =>
    p?.tenant_name ||
    p?.tenant_username ||
    p?.tenant_email ||
    p?.tenant?.username ||
    p?.tenant?.email ||
    "Tenant";
  const getPaymentListing = (p) =>
    p?.listing_title || p?.listing?.title || p?.property_title || "Property";
  const getPaymentStatus = (p) =>
    String(p?.payment_status || p?.status || "PENDING").toUpperCase();
  const getPaymentDate = (p) =>
    p?.verified_at || p?.created_at || p?.payment_date || "";
  const getPaymentAmount = (p) =>
    p?.amount ??
    p?.paid_amount ??
    p?.rent_amount ??
    p?.total_amount ??
    p?.price ??
    null;
  const getOwnerPayoutStatus = (p) =>
    String(p?.owner_payout_status || p?.payout_status || "NOT_PAID").toUpperCase();

  const isEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  const isPhone = (v) => /^[0-9+\-\s]{7,20}$/.test(String(v || "").trim());
  const isPositiveNumber = (v) => {
    const n = Number(v);
    return !Number.isNaN(n) && n > 0;
  };

  const missing360Sides = () => {
    const need = ["front", "back", "left", "right", "up", "down"];
    return need.filter((k) => !pano[k]);
  };

  const validation = useMemo(() => {
    const errors = [];

    if (!form.title.trim()) errors.push("Title is required.");
    if (!form.location.trim()) errors.push("Location is required.");

    if (!form.price_per_month || !isPositiveNumber(form.price_per_month)) {
      errors.push("Price per month must be a positive number.");
    }

    if (!form.owner_contact_number.trim()) {
      errors.push("Owner contact number is required.");
    } else if (!isPhone(form.owner_contact_number)) {
      errors.push("Owner contact number looks invalid.");
    }

    if (form.owner_contact_email && !isEmail(form.owner_contact_email)) {
      errors.push("Owner contact email looks invalid.");
    }

    if (!coverImage) errors.push("Cover image is required.");

    const missing = missing360Sides();
    if (missing.length) {
      errors.push(`All 6 photos for 360° view required. Missing: ${missing.join(", ")}`);
    }

    const okImage = (f) => f && f.type && f.type.startsWith("image/");
    if (coverImage && !okImage(coverImage)) {
      errors.push("Cover image must be an image file.");
    }

    Object.entries(pano).forEach(([k, f]) => {
      if (f && !okImage(f)) errors.push(`${k.toUpperCase()} must be an image file.`);
    });

    if (!form.latitude || !form.longitude) {
      errors.push("Please pick the property location on the map.");
    }

    return { ok: errors.length === 0, errors };
  }, [form, coverImage, pano]);

  const scrollToRef = (ref) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        ref?.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    });
  };

  const openTopPanel = (panel) => {
    setActiveTopPanel(panel);
    setShowReviews(panel === "reviews");
    setShowNotifications(panel === "notifications");
    setShowPayments(panel === "payments");

    if (panel === "reviews") {
      const ids = (reviews || []).map((r, idx) => getReviewId(r, idx)).filter(Boolean);
      if (ids.length) markReviewsSeen(ids);
    }

    if (panel === "payments") {
      const ids = (payments || []).map((p) => getPaymentId(p)).filter(Boolean);
      if (ids.length) markPaymentsSeen(ids);
    }

    scrollToRef(topPanelRef);
  };

  const closeTopPanel = () => {
    setActiveTopPanel(null);
    setShowReviews(false);
    setShowNotifications(false);
    setShowPayments(false);
  };

  const handleToggleAddProperty = () => {
    const next = !showAddProperty;

    if (next && agreement?.status !== "accepted") {
      setShowAgreementModal(true);
      return; 
    }

    setShowAddProperty(next);

    if (next) {
      setActiveTopPanel(null);
      setShowReviews(false);
      setShowNotifications(false);
      setShowPayments(false);
      scrollToRef(addPropertyRef);
    }
  };

  const handleToggleReviews = () => openTopPanel("reviews");
  const handleToggleNotifications = () => openTopPanel("notifications");
  const handleTogglePayments = () => openTopPanel("payments");

  const markBookingsSeen = (ids = []) => {
    const merged = Array.from(new Set([...(seenBookingIds || []), ...ids])).filter(
      Boolean
    );
    setSeenBookingIds(merged);
    saveSeenIds(bookingSeenKey, merged);
  };

  const markReviewsSeen = (ids = []) => {
    const merged = Array.from(new Set([...(seenReviewIds || []), ...ids])).filter(
      Boolean
    );
    setSeenReviewIds(merged);
    saveSeenIds(reviewSeenKey, merged);
  };

  const markPaymentsSeen = (ids = []) => {
    const merged = Array.from(new Set([...(seenPaymentIds || []), ...ids])).filter(
      Boolean
    );
    setSeenPaymentIds(merged);
    saveSeenIds(paymentSeenKey, merged);
  };

  const showNotificationPopup = (notif) => {
    const title = getNotifTitle(notif);
    const body = getNotifBody(notif);
    const msg = body ? `${title}: ${body}` : title;

    setToast({ type: "success", msg });

    if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
    notifToastTimerRef.current = setTimeout(() => {
      setToast({ type: "info", msg: "" });
    }, 5000);
  };

  const showReviewPopup = (review) => {
    const listing = getReviewListingTitle(review);
    const tenant = getReviewTenant(review);

    setToast({
      type: "success",
      msg: `New review received from ${tenant} for ${listing}.`,
    });

    if (reviewToastTimerRef.current) clearTimeout(reviewToastTimerRef.current);
    reviewToastTimerRef.current = setTimeout(() => {
      setToast({ type: "info", msg: "" });
    }, 5000);
  };

  const loadReviews = async (silent = false) => {
    if (!silent) {
      setReviewsLoading(true);
      setReviewsError("");
    }

    try {
      const endpoints = [
        "owner/reviews/",
        "owner/reviews",
        "reviews/owner/",
        "reviews/owner",
      ];

      let data = null;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          data = res.data;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && data == null) {
        const m =
          lastErr?.response?.data?.detail ||
          lastErr?.response?.data?.error ||
          "Reviews API not found. Please create GET /api/owner/reviews/.";
        setReviewsError(m);
        setReviews([]);
        return;
      }

      const list = arrify(data);
      setReviews(list);

      const ids = list.map((r, idx) => String(getReviewId(r, idx))).filter(Boolean);

      if (!reviewInitRef.current) {
        seenReviewIdsRef.current = new Set(ids);
        reviewInitRef.current = true;
      } else {
        const newReviews = list.filter((r, idx) => {
          const id = String(getReviewId(r, idx));
          return id && !seenReviewIdsRef.current.has(id);
        });

        if (newReviews.length > 0) {
          const newIds = newReviews
            .map((r, idx) => {
              const realIdx = list.findIndex(
                (x, i) => String(getReviewId(x, i)) === String(getReviewId(r, idx))
              );
              return String(getReviewId(r, realIdx >= 0 ? realIdx : idx));
            })
            .filter(Boolean);

          if (showReviews) {
            markReviewsSeen(newIds);
          } else {
            showReviewPopup(newReviews[0]);
          }
        }

        ids.forEach((id) => seenReviewIdsRef.current.add(id));
      }
    } finally {
      if (!silent) setReviewsLoading(false);
    }
  };

  const loadNotifications = async (silent = false) => {
    if (!silent) {
      setNotifLoading(true);
      setNotifError("");
    }

    try {
      const endpoints = [
        "notifications/",
        "notifications",
        "owner/notifications/",
        "owner/notifications",
        "notifications/owner/",
        "notifications/owner",
      ];

      let data = null;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          data = res.data;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && data == null) {
        const m =
          lastErr?.response?.data?.detail ||
          lastErr?.response?.data?.error ||
          "Notifications API not found.";
        setNotifError(m);
        setNotifications([]);
        return;
      }

      const list = arrify(data);
      setNotifications(list);

      const unread = list.filter((n) => isNotifUnread(n));
      const unreadIds = unread.map((n, idx) => String(getNotifId(n, idx))).filter(Boolean);

      if (!notifInitRef.current) {
        seenNotifIdsRef.current = new Set(unreadIds);
        notifInitRef.current = true;
      } else {
        const newUnread = unread.filter((n, idx) => {
          const id = String(getNotifId(n, idx));
          return id && !seenNotifIdsRef.current.has(id);
        });

        if (newUnread.length > 0 && !showNotifications) {
          showNotificationPopup(newUnread[0]);
        }

        unreadIds.forEach((id) => seenNotifIdsRef.current.add(id));
      }
    } catch (err) {
      if (!silent) {
        const m =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load notifications.";
        setNotifError(m);
      }
      if (!silent) setNotifications([]);
    } finally {
      if (!silent) setNotifLoading(false);
    }
  };

  const loadPayments = async (silent = false) => {
    if (!silent) {
      setPaymentsLoading(true);
      setPaymentsError("");
    }

    try {
      const res = await api.get("owner/booking-payments/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
          ? res.data.results
          : [];
      setPayments(list);
    } catch (err) {
      if (!silent) {
        setPaymentsError(err?.response?.data?.detail || "Failed to load payment records.");
      }
      setPayments([]);
    } finally {
      if (!silent) setPaymentsLoading(false);
    }
  };

  const loadAgreement = async (silent = false) => {
    if (!silent) setAgreementLoading(true);
    try {
      const res = await api.get("owner/platform-agreement/");
      setAgreement(res.data);
    } catch (err) {
      console.error("Failed to load platform agreement", err);
    } finally {
      if (!silent) setAgreementLoading(false);
    }
  };

  const respondToAgreement = async (action) => {
    setAgreementLoading(true);
    try {
      const res = await api.post("owner/platform-agreement/respond/", { action });
      setAgreement(res.data);
      if (action === "accept") {
        setToast({ type: "success", msg: "Agreement accepted! You can now add properties." });
        setShowAgreementModal(false);
        setShowAddProperty(true);
        setTimeout(() => {
          if (addPropertyRef.current) {
            addPropertyRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        setToast({ type: "info", msg: "Agreement rejected. You must accept it to add properties." });
        setShowAgreementModal(false);
      }
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.detail || "Failed to respond to agreement.",
      });
    } finally {
      setAgreementLoading(false);
    }
  };

  const markNotificationRead = async (notif) => {
    const id = notif?.id ?? notif?.notification_id ?? notif?.pk;
    if (!id) return;

    const endpoints = [
      { method: "post", url: `notifications/${id}/read/`, body: {} },
      { method: "post", url: `notifications/${id}/read`, body: {} },
      { method: "patch", url: `notifications/${id}/`, body: { is_read: true } },
      { method: "patch", url: `notifications/${id}`, body: { is_read: true } },
      { method: "post", url: `owner/notifications/${id}/read/`, body: {} },
      { method: "patch", url: `owner/notifications/${id}/`, body: { is_read: true } },
    ];

    for (const ep of endpoints) {
      try {
        if (ep.method === "post") {
          await api.post(ep.url, ep.body);
        } else {
          await api.patch(ep.url, ep.body);
        }

        setNotifications((prev) =>
          (prev || []).map((n) => {
            const nid = n?.id ?? n?.notification_id ?? n?.pk;
            if (String(nid) === String(id)) {
              return { ...n, is_read: true, read: true, seen: true };
            }
            return n;
          })
        );
        return;
      } catch { }
    }
  };

  const openNotificationGroup = async (group) => {
    if (!group) return;

    const unreadItems = (group.items || []).filter((n) => isNotifUnread(n));
    for (const item of unreadItems) {
      await markNotificationRead(item);
    }

    if (group.kind === "provider") {
      const chatLink =
        (group.items || [])
          .map((n) => getOwnerSafeNotifLink(n))
          .find((link) => link && link.includes("/owner/provider-chat/")) || "";

      const latestLink = getOwnerSafeNotifLink(group.latest);
      nav(chatLink || latestLink || "/owner/maintenance");
      return;
    }

    if (group.kind === "booking") {
      const ids = (requests || []).map((r) => getBookingId(r)).filter(Boolean);
      markBookingsSeen(ids);
      nav("/owner/messages");
      return;
    }

    if (group.kind === "review") {
      openTopPanel("reviews");
      return;
    }

    const latestLink = getOwnerSafeNotifLink(group.latest);
    if (latestLink) nav(latestLink);
  };

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onPanoChange = (side, file) =>
    setPano((s) => ({ ...s, [side]: file }));

  async function reverseGeocode(lat, lng) {
    if (inFlightRef.current.nominatim?.abort) {
      inFlightRef.current.nominatim.abort();
    }
    const ctrl = new AbortController();
    inFlightRef.current.nominatim = ctrl;

    setGeoLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });

      const data = await res.json();
      const a = data?.address || {};

      const p = {
        display: data?.display_name || "",
        road: a.road || a.highway || "",
        suburb: a.suburb || a.neighbourhood || a.quarter || "",
        city: a.city || a.town || a.village || a.municipality || "",
        state: a.state || "",
        country: a.country || "",
        postcode: a.postcode || "",
      };
      setPlace(p);

      const nice = [p.road, p.suburb, p.city, p.state, p.country]
        .filter(Boolean)
        .join(", ");

      setForm((prev) => ({ ...prev, location: nice || prev.location }));
    } catch {
      setPlace({
        display: "",
        road: "",
        suburb: "",
        city: "",
        state: "",
        country: "",
        postcode: "",
      });
    } finally {
      setGeoLoading(false);
    }
  }

  function normalizeOverpassElement(el) {
    const lat = el?.lat ?? el?.center?.lat;
    const lon = el?.lon ?? el?.center?.lon;
    if (lat == null || lon == null) return null;

    const tags = el.tags || {};
    const name =
      tags.name ||
      tags["name:en"] ||
      tags.brand ||
      tags.operator ||
      tags.amenity ||
      tags.shop ||
      tags.highway ||
      "Unknown";

    return {
      id: `${el.type}/${el.id}`,
      lat: Number(lat),
      lng: Number(lon),
      name: String(name),
      kind:
        tags.amenity ||
        tags.shop ||
        tags.highway ||
        tags.tourism ||
        tags.leisure ||
        "",
      tags,
    };
  }

  async function fetchNearbyPlaces(lat, lng, radMeters) {
    if (inFlightRef.current.overpass?.abort) {
      inFlightRef.current.overpass.abort();
    }
    const ctrl = new AbortController();
    inFlightRef.current.overpass = ctrl;

    setNearbyLoading(true);
    try {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const r = Number(radMeters);

      const q = `
[out:json][timeout:25];
(
  node(around:${r},${latNum},${lngNum})["amenity"="school"];
  way(around:${r},${latNum},${lngNum})["amenity"="school"];
  relation(around:${r},${latNum},${lngNum})["amenity"="school"];

  node(around:${r},${latNum},${lngNum})["amenity"="college"];
  way(around:${r},${latNum},${lngNum})["amenity"="college"];
  relation(around:${r},${latNum},${lngNum})["amenity"="college"];

  node(around:${r},${latNum},${lngNum})["amenity"="university"];
  way(around:${r},${latNum},${lngNum})["amenity"="university"];
  relation(around:${r},${latNum},${lngNum})["amenity"="university"];

  node(around:${r},${latNum},${lngNum})["amenity"="hospital"];
  way(around:${r},${latNum},${lngNum})["amenity"="hospital"];
  relation(around:${r},${latNum},${lngNum})["amenity"="hospital"];

  node(around:${r},${latNum},${lngNum})["amenity"="clinic"];
  way(around:${r},${latNum},${lngNum})["amenity"="clinic"];
  relation(around:${r},${latNum},${lngNum})["amenity"="clinic"];

  node(around:${r},${latNum},${lngNum})["shop"="supermarket"];
  way(around:${r},${latNum},${lngNum})["shop"="supermarket"];
  relation(around:${r},${latNum},${lngNum})["shop"="supermarket"];

  node(around:${r},${latNum},${lngNum})["amenity"="marketplace"];
  way(around:${r},${latNum},${lngNum})["amenity"="marketplace"];
  relation(around:${r},${latNum},${lngNum})["amenity"="marketplace"];

  node(around:${r},${latNum},${lngNum})["highway"="bus_stop"];
  way(around:${r},${latNum},${lngNum})["highway"="bus_stop"];
  relation(around:${r},${latNum},${lngNum})["highway"="bus_stop"];

  node(around:${r},${latNum},${lngNum})["amenity"="atm"];
  way(around:${r},${latNum},${lngNum})["amenity"="atm"];
  relation(around:${r},${latNum},${lngNum})["amenity"="atm"];
);
out center;
      `.trim();

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "text/plain" },
        body: q,
      });

      const json = await res.json();
      const els = (json?.elements || [])
        .map(normalizeOverpassElement)
        .filter(Boolean)
        .map((x) => ({
          ...x,
          distance_m: haversineMeters(latNum, lngNum, x.lat, x.lng),
        }))
        .sort((a, b) => a.distance_m - b.distance_m);

      const schools = [];
      const colleges = [];
      const hospitals = [];
      const markets = [];
      const bus = [];
      const atms = [];

      for (const it of els) {
        const t = it.tags || {};
        const amenity = t.amenity;
        const shop = t.shop;
        const highway = t.highway;

        if (amenity === "school") schools.push(it);
        else if (amenity === "college" || amenity === "university") colleges.push(it);
        else if (amenity === "hospital" || amenity === "clinic") hospitals.push(it);
        else if (shop === "supermarket" || amenity === "marketplace") markets.push(it);
        else if (highway === "bus_stop") bus.push(it);
        else if (amenity === "atm") atms.push(it);
      }

      setNearby({
        schools: schools.slice(0, 10),
        colleges: colleges.slice(0, 10),
        hospitals: hospitals.slice(0, 10),
        markets: markets.slice(0, 10),
        bus: bus.slice(0, 10),
        atms: atms.slice(0, 10),
      });
    } catch {
      setNearby({
        schools: [],
        colleges: [],
        hospitals: [],
        markets: [],
        bus: [],
        atms: [],
      });
    } finally {
      setNearbyLoading(false);
    }
  }

  const onPick = ({ lat, lng }) => {
    const lat6 = Number(lat).toFixed(6);
    const lng6 = Number(lng).toFixed(6);

    setPicked({ lat: Number(lat6), lng: Number(lng6) });

    setForm((p) => ({
      ...p,
      latitude: lat6,
      longitude: lng6,
    }));

    reverseGeocode(lat6, lng6);
    fetchNearbyPlaces(lat6, lng6, radius);
  };

  const clearPicked = () => {
    setPicked(null);
    setForm((p) => ({ ...p, latitude: "", longitude: "" }));
    setPlace({
      display: "",
      road: "",
      suburb: "",
      city: "",
      state: "",
      country: "",
      postcode: "",
    });
    setNearby({
      schools: [],
      colleges: [],
      hospitals: [],
      markets: [],
      bus: [],
      atms: [],
    });
  };

  const handleLogout = () => {
    logout();
    nav("/", { replace: true });
  };

  useEffect(() => {
    if (toast.msg) {
      const t = setTimeout(() => {
        setToast({ type: "info", msg: "" });
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    setSeenBookingIds(loadSeenIds(bookingSeenKey));
    setSeenReviewIds(loadSeenIds(reviewSeenKey));
    setSeenPaymentIds(loadSeenIds(paymentSeenKey));
  }, [bookingSeenKey, reviewSeenKey, paymentSeenKey]);

  useEffect(() => {
    if (!form.latitude || !form.longitude) return;
    fetchNearbyPlaces(form.latitude, form.longitude, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  useEffect(() => {
    if (booting) return;

    const token =
      localStorage.getItem("access") || localStorage.getItem("access_token");
    const savedUser = readStoredUser();
    const savedRole = (localStorage.getItem("role") || savedUser?.role || "")
      .toString()
      .toLowerCase();

    const currentRole = (role || savedRole || "").toString().toLowerCase();

    if (!token) {
      nav("/auth", { replace: true });
      return;
    }

    if (currentRole && currentRole !== "owner") {
      nav("/unauthorized", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await api.get("owner-profile/");
        const data = res.data || {};
        const ownerObj = data.owner || data;
        setProfile(ownerObj);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          nav("/auth", { replace: true });
          return;
        }
        if (status === 403) {
          nav("/unauthorized", { replace: true });
          return;
        }

        const m =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load owner profile.";
        setToast({ type: "error", msg: m });
      }
    };

    const loadAgreementOnMount = async () => {
      await loadAgreement(false);
    };

    const loadInbox = async (silent = false) => {
      if (!silent) setLoadingMsgs(true);

      try {
        const res = await api.get("owner/booking-requests/");
        const list = arrify(res.data);
        setRequests(list);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          nav("/auth", { replace: true });
          return;
        }
        if (status === 403) {
          nav("/unauthorized", { replace: true });
          return;
        }
        setRequests([]);
      } finally {
        if (!silent) setLoadingMsgs(false);
      }
    };

    loadProfile();
    loadInbox(false);
    loadNotifications(false);
    loadReviews(false);
    loadPayments(false);
    loadAgreementOnMount();

    const inboxInterval = setInterval(() => loadInbox(true), 5000);
    const notifInterval = setInterval(() => loadNotifications(true), 10000);
    const reviewInterval = setInterval(() => loadReviews(true), 15000);
    const paymentInterval = setInterval(() => loadPayments(true), 20000);
    const agreementInterval = setInterval(() => loadAgreement(true), 30000);

    return () => {
      clearInterval(inboxInterval);
      clearInterval(notifInterval);
      clearInterval(reviewInterval);
      clearInterval(paymentInterval);
      clearInterval(agreementInterval);
      if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
      if (reviewToastTimerRef.current) clearTimeout(reviewToastTimerRef.current);
    };
  }, [booting, role, nav]);

  useEffect(() => {
    if (showReviews) {
      loadReviews(false);
      const ids = (reviews || []).map((r, idx) => getReviewId(r, idx)).filter(Boolean);
      if (ids.length) markReviewsSeen(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReviews]);

  useEffect(() => {
    if (showNotifications) loadNotifications(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications]);

  useEffect(() => {
    if (showPayments) loadPayments(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPayments]);

  useEffect(() => {
    if (showReviews && reviews.length > 0) {
      const ids = reviews.map((r, idx) => getReviewId(r, idx)).filter(Boolean);
      markReviewsSeen(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, showReviews]);

  const submitProperty = async (e) => {
    e.preventDefault();

    if (!validation.ok) {
      setToast({
        type: "error",
        msg: validation.errors[0] || "Please fix form errors.",
      });
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description || "");
    fd.append("property_type", form.property_type);
    fd.append("location", form.location.trim());
    fd.append("price_per_month", String(form.price_per_month));
    fd.append("electricity_bill", form.electricity_bill || "");
    fd.append("owner_contact_number", String(form.owner_contact_number).trim());
    fd.append("owner_contact_email", form.owner_contact_email || "");
    fd.append("image", coverImage);

    fd.append("latitude", Number(form.latitude).toFixed(6));
    fd.append("longitude", Number(form.longitude).toFixed(6));

    fd.append("pano_front", pano.front);
    fd.append("pano_back", pano.back);
    fd.append("pano_left", pano.left);
    fd.append("pano_right", pano.right);
    fd.append("pano_up", pano.up);
    fd.append("pano_down", pano.down);

    setPosting(true);
    try {
      await api.post("owner/listings/create/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setToast({ type: "success", msg: "Property posted successfully." });

      setForm({
        title: "",
        description: "",
        property_type: "house",
        location: "",
        price_per_month: "",
        electricity_bill: "",
        owner_contact_number: "",
        owner_contact_email: "",
        latitude: "",
        longitude: "",
      });

      setCoverImage(null);
      setPano({
        front: null,
        back: null,
        left: null,
        right: null,
        up: null,
        down: null,
      });
      clearPicked();
      setShowAddProperty(false);
    } catch (err) {
      const m =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        (err?.response?.data && JSON.stringify(err.response.data)) ||
        "Failed to post property.";
      setToast({ type: "error", msg: m });
    } finally {
      setPosting(false);
    }
  };

  const unreadBookingCount = useMemo(() => {
    return (requests || []).filter((r) => {
      const id = getBookingId(r);
      return id && !seenBookingIds.includes(id);
    }).length;
  }, [requests, seenBookingIds]);

  const unreadReviewCount = useMemo(() => {
    return (reviews || []).filter((r, idx) => {
      const id = getReviewId(r, idx);
      return id && !seenReviewIds.includes(id);
    }).length;
  }, [reviews, seenReviewIds]);

  const unreadNotifCount = useMemo(() => {
    return (notifications || []).filter((n) => isNotifUnread(n)).length;
  }, [notifications]);

  const unreadPaymentCount = useMemo(() => {
    return (payments || []).filter((p) => {
      const id = getPaymentId(p);
      return id && !seenPaymentIds.includes(id);
    }).length;
  }, [payments, seenPaymentIds]);

  const latestRequests = useMemo(() => {
    const list = [...(requests || [])];
    list.sort((a, b) =>
      String(b?.created_at || "").localeCompare(String(a?.created_at || ""))
    );
    return list.slice(0, 4);
  }, [requests]);

  const filteredReviews = useMemo(() => {
    const q = String(reviewQuery || "").trim().toLowerCase();
    const list = [...(reviews || [])];
    list.sort((a, b) =>
      String(getReviewCreatedAt(b) || "").localeCompare(
        String(getReviewCreatedAt(a) || "")
      )
    );
    if (!q) return list;
    return list.filter((r) => {
      const t = `${getReviewListingTitle(r)} ${getReviewTenant(r)} ${getReviewComment(
        r
      )} ${getReviewRating(r) ?? ""}`.toLowerCase();
      return t.includes(q);
    });
  }, [reviews, reviewQuery]);

  const groupedNotifications = useMemo(() => {
    const list = [...(notifications || [])];
    list.sort((a, b) =>
      String(getNotifCreatedAt(b) || "").localeCompare(
        String(getNotifCreatedAt(a) || "")
      )
    );

    const groups = new Map();

    list.forEach((n) => {
      const kind = getNotifKind(n);
      const sender = getNotifSender(n);
      const key = `${kind}__${sender}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          kind,
          sender,
          latest: n,
          items: [],
          count: 0,
          unreadCount: 0,
          searchText: "",
        });
      }

      const g = groups.get(key);
      g.items.push(n);
      g.count += 1;
      if (isNotifUnread(n)) g.unreadCount += 1;

      const currentLatest = String(getNotifCreatedAt(g.latest) || "");
      const itemDate = String(getNotifCreatedAt(n) || "");
      if (itemDate.localeCompare(currentLatest) > 0) {
        g.latest = n;
      }

      g.searchText += ` ${getNotifTitle(n)} ${getNotifBody(n)} ${sender} ${kind}`;
    });

    return Array.from(groups.values()).sort((a, b) =>
      String(getNotifCreatedAt(b.latest) || "").localeCompare(
        String(getNotifCreatedAt(a.latest) || "")
      )
    );
  }, [notifications]);

  const unreadServiceProviderCount = useMemo(() => {
    return (groupedNotifications || [])
      .filter((g) => g.kind === "provider")
      .reduce((acc, g) => acc + (g.unreadCount || 0), 0);
  }, [groupedNotifications]);

  const markServiceProviderNotificationsRead = async () => {
    const providerGroups = (groupedNotifications || []).filter(
      (g) => g.kind === "provider"
    );
    for (const group of providerGroups) {
      const unreadItems = (group.items || []).filter((n) => isNotifUnread(n));
      for (const item of unreadItems) {
        await markNotificationRead(item);
      }
    }
  };

  const filteredNotifGroups = useMemo(() => {
    const q = String(notifQuery || "").trim().toLowerCase();
    if (!q) return groupedNotifications;
    return groupedNotifications.filter((g) =>
      String(g.searchText || "").toLowerCase().includes(q)
    );
  }, [groupedNotifications, notifQuery]);

  const paymentSummary = useMemo(() => {
    const total = (payments || []).length;
    const complete = (payments || []).filter(
      (p) => getPaymentStatus(p) === "COMPLETE"
    ).length;
    const pending = (payments || []).filter(
      (p) => getPaymentStatus(p) === "PENDING"
    ).length;
    const rejected = total - complete - pending;

    return { total, complete, pending, rejected };
  }, [payments]);

  const paymentBadge = (status) => {
    if (status === "COMPLETE")
      return isDark
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "PENDING")
      return isDark
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : "border-amber-200 bg-amber-50 text-amber-700";
    return isDark
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-red-200 bg-red-50 text-red-700";
  };

  const QuickAction = ({
    icon: Icon,
    label,
    subtitle,
    onClick,
    active = false,
    count,
    accent = "blue",
  }) => {
    const accentMap = {
      blue: {
        bg: "bg-blue-100",
        border: "border-blue-200",
        hover: "hover:bg-blue-100",
        icon: "bg-blue-200 text-blue-700",
        iconHover: "group-hover:bg-blue-300",
        countBg: "bg-blue-100",
        countBorder: "border-blue-200",
        countText: "text-blue-700",
      },
      green: {
        bg: "bg-emerald-100",
        border: "border-emerald-200",
        hover: "hover:bg-blue-100",
        icon: "bg-emerald-200 text-emerald-700",
        iconHover: "group-hover:bg-emerald-300",
        countBg: "bg-emerald-100",
        countBorder: "border-emerald-200",
        countText: "text-emerald-700",
      },
      pink: {
        bg: "bg-pink-100",
        border: "border-pink-200",
        hover: "hover:bg-blue-100",
        icon: "bg-pink-200 text-pink-700",
        iconHover: "group-hover:bg-pink-300",
        countBg: "bg-pink-100",
        countBorder: "border-pink-200",
        countText: "text-pink-700",
      },
      purple: {
        bg: "bg-violet-100",
        border: "border-violet-200",
        hover: "hover:bg-blue-100",
        icon: "bg-violet-200 text-violet-700",
        iconHover: "group-hover:bg-violet-300",
        countBg: "bg-violet-100",
        countBorder: "border-violet-200",
        countText: "text-violet-700",
      },
      amber: {
        bg: "bg-amber-100",
        border: "border-amber-200",
        hover: "hover:bg-blue-100",
        icon: "bg-amber-200 text-amber-700",
        iconHover: "group-hover:bg-amber-300",
        countBg: "bg-amber-100",
        countBorder: "border-amber-200",
        countText: "text-amber-700",
      },
      cyan: {
        bg: "bg-cyan-100",
        border: "border-cyan-200",
        hover: "hover:bg-blue-100",
        icon: "bg-cyan-200 text-cyan-700",
        iconHover: "group-hover:bg-cyan-300",
        countBg: "bg-cyan-100",
        countBorder: "border-cyan-200",
        countText: "text-cyan-700",
      },
      indigo: {
        bg: "bg-indigo-100",
        border: "border-indigo-200",
        hover: "hover:bg-blue-100",
        icon: "bg-indigo-200 text-indigo-700",
        iconHover: "group-hover:bg-indigo-300",
        countBg: "bg-indigo-100",
        countBorder: "border-indigo-200",
        countText: "text-indigo-700",
      },
    };

    const acc = accentMap[accent] || accentMap.blue;
    const activeClass = active ? "ring-2 ring-slate-300" : "";

    return (
      <button
        onClick={onClick}
        className={`group flex h-full min-h-[130px] flex-col justify-between rounded-3xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${acc.bg} ${acc.border} ${acc.hover} ${activeClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${acc.icon} ${acc.iconHover}`}>
            <Icon className="h-5 w-5" />
          </div>

          {count !== undefined ? (
            <span
              className={`inline-flex min-w-[28px] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-extrabold transition-colors ${acc.countBorder} ${acc.countBg} ${acc.countText}`}
            >
              {count}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-900">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">{subtitle}</p>
        </div>
      </button>
    );
  };

  const StatCard = ({ label, value, icon: Icon, accent = "blue" }) => {
    const accentMap = {
      blue: isDark
        ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-400/20 text-blue-300"
        : "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200/50 text-blue-700",
      green: isDark
        ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-400/20 text-emerald-300"
        : "bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200/50 text-emerald-700",
      amber: isDark
        ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400/20 text-amber-300"
        : "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200/50 text-amber-700",
      yellow: isDark
        ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-400/20 text-yellow-300"
        : "bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-200/50 text-yellow-700",
      red: isDark
        ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-400/20 text-red-300"
        : "bg-gradient-to-br from-red-100 to-red-50 border-red-200/50 text-red-700",
      violet: isDark
        ? "bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-400/20 text-violet-300"
        : "bg-gradient-to-br from-violet-100 to-violet-50 border-violet-200/50 text-violet-700",
      pink: isDark
        ? "bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-400/20 text-pink-300"
        : "bg-gradient-to-br from-pink-100 to-pink-50 border-pink-200/50 text-pink-700",
      indigo: isDark
        ? "bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-400/20 text-indigo-300"
        : "bg-gradient-to-br from-indigo-100 to-indigo-50 border-indigo-200/50 text-indigo-700",
      cyan: isDark
        ? "bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-400/20 text-cyan-300"
        : "bg-gradient-to-br from-cyan-100 to-cyan-50 border-cyan-200/50 text-cyan-700",
      orange: isDark
        ? "bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-400/20 text-orange-300"
        : "bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200/50 text-orange-700",
    };

    return (
      <div className={`rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${accentMap[accent]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${ui.muted}`}>
              {label}
            </p>
            <h3 className={`mt-2 text-3xl font-black tracking-tight ${ui.heading}`}>
              {value}
            </h3>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark
            ? "bg-white/10 border border-white/20"
            : "bg-white/80 border border-white/60 shadow-sm"
            }`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  };
/* --- Sub-components moved outside for stability --- */

  const renderFocusedTopPanel = () => {
    if (!activeTopPanel) return null;

    if (activeTopPanel === "reviews") {
      return (
        <div ref={topPanelRef} className={`mt-8 rounded-[32px] p-6 lg:p-8 ${ui.card}`}>
          <SectionTitle
            title="Tenant Reviews Dashboard"
            right={
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                <div className="relative w-full md:w-[320px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={reviewQuery}
                    onChange={(e) => setReviewQuery(e.target.value)}
                    placeholder="Search reviews"
                    className={`h-12 w-full rounded-2xl border pl-11 pr-4 outline-none ${ui.input}`}
                  />
                </div>
                <button
                  onClick={closeTopPanel}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.smallAction}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            }
          />

          {reviewsLoading ? (
            <div className={`rounded-2xl p-5 ${ui.soft}`}>
              <div className={`text-sm ${ui.sub}`}>Loading reviews...</div>
            </div>
          ) : reviewsError ? (
            <div
              className={`rounded-2xl border p-5 text-sm ${isDark
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
                }`}
            >
              {reviewsError}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className={`rounded-2xl p-5 ${ui.soft}`}>
              <div className={`text-sm ${ui.sub}`}>No reviews found.</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredReviews.map((review, idx) => (
                <div
                  key={getReviewId(review, idx)}
                  className={`rounded-3xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isDark
                    ? "border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5"
                    : "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-25"
                    }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-lg font-black ${ui.heading}`}>
                          {getReviewListingTitle(review)}
                        </h3>
                        {getReviewRating(review) != null ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${ui.badgeAmber}`}>
                            {starString(getReviewRating(review))} ({getReviewRating(review)})
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-2 text-sm ${ui.sub}`}>
                        Reviewed by: <span className="font-semibold">{getReviewTenant(review)}</span>
                      </p>
                      <p className={`mt-3 text-sm leading-7 ${ui.sub}`}>
                        {getReviewComment(review) || "No comment provided."}
                      </p>
                    </div>

                    <div className={`text-xs ${ui.muted}`}>
                      {formatDate(getReviewCreatedAt(review))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTopPanel === "notifications") {
      return (
        <div ref={topPanelRef} className={`mt-8 rounded-[32px] p-6 lg:p-8 ${ui.card}`}>
          <SectionTitle
            title="Notifications Dashboard"
            right={
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                <div className="relative w-full md:w-[320px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={notifQuery}
                    onChange={(e) => setNotifQuery(e.target.value)}
                    placeholder="Search notifications"
                    className={`h-12 w-full rounded-2xl border pl-11 pr-4 outline-none ${ui.input}`}
                  />
                </div>
                <button
                  onClick={closeTopPanel}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.smallAction}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            }
          />

          {notifLoading ? (
            <div className={`rounded-2xl p-5 ${ui.soft}`}>
              <div className={`text-sm ${ui.sub}`}>Loading notifications...</div>
            </div>
          ) : notifError ? (
            <div
              className={`rounded-2xl border p-5 text-sm ${isDark
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
                }`}
            >
              {notifError}
            </div>
          ) : filteredNotifGroups.length === 0 ? (
            <div className={`rounded-2xl p-5 ${ui.soft}`}>
              <div className={`text-sm ${ui.sub}`}>No notifications found.</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredNotifGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => openNotificationGroup(group)}
                  className={`rounded-3xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isDark
                    ? "border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-700/40 hover:bg-blue-100 hover:border-blue-200"
                    : "border-slate-200 bg-gradient-to-br from-white to-slate-50/60 hover:bg-blue-100 hover:border-blue-200"
                    }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-lg font-black ${ui.heading}`}>
                          {getGroupedTitle(group)}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getNotifKindClasses(group.latest)}`}
                        >
                          {getNotifKindLabel(group.latest)}
                        </span>
                        {group.unreadCount > 0 ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${ui.badgeBlue}`}>
                            {group.unreadCount} unread
                          </span>
                        ) : null}
                      </div>

                      <p className={`mt-2 text-sm ${ui.sub}`}>{getGroupedBody(group)}</p>

                      <div className={`mt-3 text-xs ${ui.muted}`}>
                        Latest: {getNotifTitle(group.latest)}
                      </div>
                    </div>

                    <div className={`text-xs ${ui.muted}`}>
                      {formatDate(getNotifCreatedAt(group.latest))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTopPanel === "payments") {
      return (
        <div ref={topPanelRef} className={`mt-8 rounded-[32px] p-6 lg:p-8 ${ui.card}`}>
          <SectionTitle
            title="Payment Dashboard"
            right={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => loadPayments(false)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.smallAction}`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  onClick={closeTopPanel}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.smallAction}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            }
          />

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="All Records" value={paymentSummary.total} icon={CreditCard} accent="blue" />
            <StatCard label="Complete" value={paymentSummary.complete} icon={Wallet} accent="green" />
            <StatCard label="Pending" value={paymentSummary.pending} icon={Bell} accent="amber" />
            <StatCard label="Other" value={paymentSummary.rejected} icon={Wrench} accent="violet" />
          </div>

          {paymentsLoading ? (
            <div className={`rounded-2xl p-5 ${ui.soft}`}>
              <div className={`text-sm ${ui.sub}`}>Loading payment records...</div>
            </div>
          ) : paymentsError ? (
            <div
              className={`rounded-2xl border p-5 text-sm ${isDark
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
                }`}
            >
              {paymentsError}
            </div>
          ) : payments.length === 0 ? (
            <div className={`rounded-2xl p-5 ${ui.soft}`}>
              <div className={`text-sm ${ui.sub}`}>No payment records found.</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {payments.map((payment, idx) => {
                const status = getPaymentStatus(payment);
                const payout = getOwnerPayoutStatus(payment);
                const amount = getPaymentAmount(payment);

                return (
                  <div
                    key={getPaymentId(payment, idx)}
                    className={`rounded-3xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${status === "COMPLETE"
                      ? isDark
                        ? "border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"
                        : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-25"
                      : status === "PENDING"
                        ? isDark
                          ? "border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5"
                          : "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-25"
                        : isDark
                          ? "border-slate-400/20 bg-gradient-to-br from-slate-500/10 to-slate-600/5"
                          : "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-25"
                      }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-lg font-black ${ui.heading}`}>
                            {getPaymentListing(payment)}
                          </h3>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${paymentBadge(status)}`}>
                            {status}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${ui.badgePurple}`}>
                            Owner payout: {payout}
                          </span>
                        </div>

                        <p className={`text-sm ${ui.sub}`}>
                          Tenant: <span className="font-semibold">{getPaymentTenant(payment)}</span>
                        </p>

                        {amount != null ? (
                          <p className={`text-sm ${ui.sub}`}>
                            Amount: <span className="font-semibold">Rs {amount}</span>
                          </p>
                        ) : null}

                        <p className={`text-sm ${ui.sub}`}>
                          Date: <span className="font-semibold">{formatDate(getPaymentDate(payment))}</span>
                        </p>
                      </div>

                      <div className={`text-xs ${ui.muted}`}>
                        Payment ID: {getPaymentId(payment, idx)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Shell
      title="Owner Dashboard"
      subtitle={`Welcome back, ${displayEmail}. Manage properties, requests, reviews, notifications, and payments.`}
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${isDark
              ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
              : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <div className={`min-h-screen w-full ${ui.pageBg}`}>
        <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8 2xl:px-10">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className={`rounded-[32px] p-7 ${ui.card}`}>
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-blue-600">
                    Smart Rental House Finder
                  </p>
                  <h1 className={`text-3xl font-black leading-tight xl:text-4xl ${ui.heading}`}>
                    Owner control center for your entire rental workflow
                  </h1>
                  <p className={`mt-3 max-w-2xl text-sm leading-6 ${ui.sub}`}>
                    Post new properties, review tenant requests, monitor notifications,
                    manage service updates, and track payments in one professional dashboard.
                  </p>

                  {agreement && agreement.status !== "accepted" && (
                    <div className={`mt-6 rounded-2xl border p-4 ${isDark ? "border-amber-500/20 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-amber-500/20" : "bg-amber-100"}`}>
                          <FileText className={`h-5 w-5 ${isDark ? "text-amber-300" : "text-amber-700"}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-sm font-bold ${isDark ? "text-amber-200" : "text-amber-900"}`}>
                            Platform Agreement Required
                          </h4>
                          <p className={`text-xs ${isDark ? "text-amber-300/80" : "text-amber-700/80"}`}>
                            You must accept the listing agreement before you can post properties.
                          </p>
                        </div>
                        <button
                          onClick={() => nav("/owner/contract")}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${isDark ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-amber-600 text-white hover:bg-amber-700"}`}
                        >
                          View Agreement
                        </button>
                      </div>
                    </div>
                  )}

                  {profile ? (
                    <div className={`mt-4 flex flex-wrap items-center gap-3 text-sm ${ui.sub}`}>
                      <span className={`rounded-full px-3 py-1 ${ui.soft}`}>
                        <UserRound className="mr-2 inline h-4 w-4" />
                        {profile?.username || profile?.email || displayEmail}
                      </span>
                      <span className={`rounded-full px-3 py-1 ${ui.soft}`}>
                        Owner Account
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => nav("/owner/listings/create")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {showAddProperty ? "Close Add Property" : "Add Property"}
                  </button>

                  <button
                    onClick={() => nav("/owner/my-properties")}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${isDark
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                  >
                    <Building2 className="h-4 w-4" />
                    My Properties
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Messages"
                value={loadingMsgs ? "..." : unreadBookingCount}
                icon={MessageSquare}
                accent="blue"
              />
              <StatCard
                label="Reviews"
                value={reviewsLoading ? "..." : unreadReviewCount}
                icon={Star}
                accent="amber"
              />
              <StatCard
                label="Notifications"
                value={notifLoading ? "..." : unreadNotifCount}
                icon={Wallet}
                accent="purple"
              />
              <StatCard
                label="Payments"
                value={paymentsLoading ? "..." : unreadPaymentCount}
                icon={CreditCard}
                accent="green"
              />
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle title="Owner Tools Hub" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9">
              <QuickAction
                icon={Building2}
                label="My Properties"
                subtitle="View all properties you listed"
                onClick={() => nav("/owner/my-properties")}
                accent="blue"
              />
              <QuickAction
                icon={PlusCircle}
                label="Add Property"
                subtitle="Create a new property listing"
                onClick={() => nav("/owner/listings/create")}
                accent="green"
              />

              <QuickAction
                icon={FileText}
                label="Owner Agreement"
                subtitle="Read owner agreement and commission rules"
                onClick={() => nav("/owner/contract")}
                accent="indigo"
              />

              <QuickAction
                icon={FileText}
                label="Rental Contracts"
                subtitle="View, edit, send, and finalize tenant rental contracts"
                onClick={() => nav("/owner/contracts")}
                accent="cyan"
              />

              <QuickAction
                icon={MessageSquare}
                label="Messages"
                subtitle="Open tenant booking requests"
                onClick={() => {
                  markBookingsSeen(
                    (requests || []).map((r) => getBookingId(r)).filter(Boolean)
                  );
                  nav("/owner/messages");
                }}
                count={loadingMsgs ? "..." : unreadBookingCount}
                accent="cyan"
              />
              <QuickAction
                icon={Star}
                label="Reviews"
                subtitle="See tenant ratings and comments"
                onClick={handleToggleReviews}
                active={activeTopPanel === "reviews"}
                count={reviewsLoading ? "..." : unreadReviewCount}
                accent="amber"
              />
              <QuickAction
                icon={Wallet}
                label="Notifications"
                subtitle="Grouped alerts from the system"
                onClick={handleToggleNotifications}
                active={activeTopPanel === "notifications"}
                count={notifLoading ? "..." : unreadNotifCount}
                accent="purple"
              />
              <QuickAction
                icon={CreditCard}
                label="Payments"
                subtitle="Track verified payment records"
                onClick={() => {
                  markPaymentsSeen((payments || []).map(getPaymentId).filter(Boolean));
                  nav("/owner/booking-payments");
                }}
                count={paymentsLoading ? "..." : unreadPaymentCount}
                accent="green"
              />
              <QuickAction
                icon={Wrench}
                label="Maintenance"
                subtitle="Open provider maintenance panel"
                onClick={async () => {
                  await markServiceProviderNotificationsRead();
                  nav("/owner/maintenance");
                }}
                count={unreadServiceProviderCount > 0 ? unreadServiceProviderCount : undefined}
                accent="indigo"
              />
              <QuickAction
                icon={MessageSquare}
                label="Service Provider Chat"
                subtitle="Direct communication with service providers"
                onClick={async () => {
                  await markServiceProviderNotificationsRead();
                  nav("/owner/provider-chat");
                }}
                count={unreadServiceProviderCount > 0 ? unreadServiceProviderCount : undefined}
                accent="pink"
              />
            </div>
          </div>

          {renderFocusedTopPanel()}

          {showAgreementModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className={`w-full max-w-2xl rounded-[32px] border p-8 lg:p-10 ${ui.card} shadow-2xl`}>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                      <FileText className={`h-6 w-6 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-black ${ui.heading}`}>Platform Agreement</h3>
                      <p className={`text-sm ${ui.muted}`}>Agreement required to list properties</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAgreementModal(false)}
                    className={`rounded-full p-2 transition hover:bg-white/10 ${ui.muted}`}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className={`mb-8 max-h-[450px] overflow-y-auto rounded-3xl border p-6 leading-8 transition-all ${isDark ? "border-white/5 bg-[#071120] text-slate-300" : "border-slate-200 bg-white text-slate-700"}`}>
                  <div className="whitespace-pre-wrap text-[15px]">
                    {agreement?.agreement_text || "Loading platform agreement..."}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => respondToAgreement("accept")}
                    disabled={agreementLoading}
                    className="w-full rounded-2xl bg-blue-600 py-4 text-base font-black text-white transition hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl disabled:opacity-50"
                  >
                    {agreementLoading ? "Accepting..." : "I Accept & Want to Add Property"}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => respondToAgreement("reject")}
                      disabled={agreementLoading}
                      className={`flex-1 rounded-2xl border py-4 text-sm font-black transition disabled:opacity-50 ${ui.smallAction}`}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setShowAgreementModal(false)}
                      className={`flex-1 rounded-2xl border py-4 text-sm font-black transition ${ui.smallAction}`}
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`mt-8 grid grid-cols-1 gap-6 ${activeTopPanel ? "xl:grid-cols-1" : "xl:grid-cols-[1.2fr_1fr]"}`}>
            <div className={`rounded-[32px] p-6 ${ui.card}`}>
              <SectionTitle
                title="Latest Booking Requests"
                right={
                  <button
                    onClick={() => {
                      markBookingsSeen(
                        (requests || []).map((r) => getBookingId(r)).filter(Boolean)
                      );
                      nav("/owner/messages");
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${ui.smallAction}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Open inbox
                  </button>
                }
              />

              {loadingMsgs ? (
                <div className={`rounded-2xl p-5 ${ui.soft}`}>
                  <div className={`text-sm ${ui.sub}`}>Loading booking requests...</div>
                </div>
              ) : latestRequests.length === 0 ? (
                <div className={`rounded-2xl p-5 ${ui.soft}`}>
                  <div className={`text-sm ${ui.sub}`}>No booking requests available.</div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {latestRequests.map((req, idx) => {
                    const bookingId = getBookingId(req);
                    const status = getStatus(req);

                    const statusClasses =
                      status === "accepted"
                        ? ui.badgeGreen
                        : status === "rejected"
                          ? (isDark
                            ? "border-red-500/20 bg-red-500/10 text-red-300"
                            : "border-red-200 bg-red-50 text-red-700")
                          : ui.badgeAmber;

                    return (
                      <div key={bookingId || idx} className={`rounded-3xl p-5 ${ui.soft}`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`text-lg font-black ${ui.heading}`}>
                                {getListingTitle(req)}
                              </h3>
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses}`}>
                                {status}
                              </span>
                            </div>

                            <p className={`mt-3 text-sm ${ui.sub}`}>
                              Tenant: {getTenantName(req)} • {getTenantEmail(req)}
                            </p>

                            <p className={`mt-4 text-sm leading-7 ${ui.sub}`}>
                              {getFirstMessage(req) || "No message preview available."}
                            </p>
                          </div>

                          <div className={`text-xs ${ui.muted}`}>
                            {formatDate(req?.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!activeTopPanel && (
              <div className={`rounded-[32px] p-6 ${ui.card}`}>
                <SectionTitle
                  title="Dashboard Summary"
                  right={
                    <button
                      onClick={() => {
                        loadNotifications(false);
                        loadReviews(false);
                        loadPayments(false);
                      }}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${ui.smallAction}`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                  }
                />

                <div className="grid gap-4">
                  <div className={`rounded-3xl p-5 ${ui.soft}`}>
                    <div className={`mb-2 text-xs font-bold uppercase tracking-[0.18em] ${ui.muted}`}>
                      Owner Account
                    </div>
                    <div className={`text-base font-bold ${ui.heading}`}>{displayEmail}</div>
                    <div className={`mt-1 text-sm ${ui.sub}`}>
                      Manage your rentals, messages, and records professionally.
                    </div>
                  </div>

                  <div className={`rounded-3xl p-5 ${ui.soft}`}>
                    <div className={`mb-2 text-xs font-bold uppercase tracking-[0.18em] ${ui.muted}`}>
                      Actions Available
                    </div>
                    <div className={`text-sm leading-7 ${ui.sub}`}>
                      Post new property listings, open tenant messages, review ratings,
                      inspect grouped notifications, and monitor completed payment records.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>



          {/* Hidden refs kept for compatibility with your existing logic */}
          <div ref={reviewsRef} className="h-0 w-0 overflow-hidden" />
          <div ref={notificationsRef} className="h-0 w-0 overflow-hidden" />
          <div ref={paymentsRef} className="h-0 w-0 overflow-hidden" />
        </div>
      </div>
    </Shell>
  );
}

/* --- Stabilized Sub-components (Moved outside to prevent re-mounting) --- */
const SectionTitle = ({ title, right, ui }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <h2 className={`text-xl font-black tracking-tight ${ui?.heading || ""}`}>{title}</h2>
    {right}
  </div>
);

const FileField = ({ label, value, onChange, required = false, isDark, ui }) => {
  const preview = useMemo(() => {
    if (!value || !(value instanceof File)) return null;
    try {
      return URL.createObjectURL(value);
    } catch (e) {
      return null;
    }
  }, [value]);

  return (
    <div>
      <label className={`mb-2 block text-sm font-semibold ${ui?.heading || ""}`}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div
        className={`relative overflow-hidden flex min-h-[140px] flex-col items-center justify-center rounded-2xl border transition ${isDark
          ? "border-white/10 bg-[#16345c] hover:bg-[#1a3b67]"
          : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
      >
        {preview ? (
          <div className="relative h-full w-full p-2">
            <img src={preview} alt={label} className="h-24 w-full rounded-xl object-cover shadow-sm" />
            <div className="mt-2 text-center">
              <div className={`truncate text-[10px] font-bold ${ui?.heading || ""}`}>{value.name}</div>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="mt-1 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition"
              >
                Remove File
              </button>
            </div>
          </div>
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-4">
            <ImageIcon className={`mb-2 h-7 w-7 ${ui?.muted || ""} opacity-40`} />
            <span className={`text-[11px] font-black uppercase tracking-widest ${ui?.heading || ""}`}>Choose image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onChange(e.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>
    </div>
  );
};

const NearbyList = ({ title, items, ui }) => (
  <div className={`rounded-3xl p-4 ${ui?.soft || ""}`}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className={`text-sm font-semibold ${ui?.heading || ""}`}>{title}</div>
      <div className={`text-xs ${ui?.muted || ""}`}>{items.length}</div>
    </div>

    {items.length === 0 ? (
      <div className={`text-sm ${ui?.muted || ""}`}>No places found.</div>
    ) : (
      <div className="grid gap-3">
        {items.map((it) => (
          <div key={it.id} className={`rounded-2xl p-3 ${ui?.card || ""}`}>
            <div className={`text-sm font-semibold ${ui?.heading || ""}`}>{it.name}</div>
            <div className={`mt-1 text-xs ${ui?.sub || ""}`}>
              {it.kind ? `Type: ${it.kind} • ` : ""}
              Distance: {it.distance_m > 1000 ? (it.distance_m / 1000).toFixed(1) + "km" : it.distance_m + "m"}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);