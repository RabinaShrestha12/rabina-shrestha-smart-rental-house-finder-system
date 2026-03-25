import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import LocationPicker from "../../components/LocationPicker";

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

export default function OwnerDashboard() {
  const { role, email, logout, booting } = useAuth();
  const nav = useNavigate();

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

  const [theme, setTheme] = useState(
    () => localStorage.getItem("owner_dashboard_theme") || "light"
  );

  useEffect(() => {
    localStorage.setItem("owner_dashboard_theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  const ui = {
    page: isDark
      ? "min-h-screen bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#111827_35%,_#020617_100%)] text-white"
      : "min-h-screen bg-gradient-to-br from-white via-slate-50 to-sky-100 text-slate-900",

    hero: isDark
      ? "rounded-[30px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl"
      : "rounded-[30px] border border-slate-200 bg-white/95 shadow-xl",

    card: isDark
      ? "rounded-[24px] border border-white/10 bg-white/5 shadow-lg"
      : "rounded-[24px] border border-slate-200 bg-white shadow-md",

    softCard: isDark
      ? "rounded-2xl border border-white/10 bg-black/20"
      : "rounded-2xl border border-slate-200 bg-slate-50",

    input: isDark
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-slate-400 focus:border-blue-400/40"
      : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500",

    textarea: isDark
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-slate-400 focus:border-blue-400/40"
      : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500",

    button: isDark
      ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
      : "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100",

    primaryButton: isDark
      ? "rounded-2xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
      : "rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100",

    successButton: isDark
      ? "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
      : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100",

    warningButton: isDark
      ? "rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15"
      : "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100",

    dangerButton: isDark
      ? "rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
      : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100",

    title: isDark ? "text-white" : "text-slate-900",
    subtext: isDark ? "text-slate-300" : "text-slate-600",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    sectionTitle: isDark ? "text-white" : "text-slate-900",

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

    badgeRed: isDark
      ? "border-red-500/20 bg-red-500/10 text-red-100"
      : "border-red-200 bg-red-50 text-red-700",
  };

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [profile, setProfile] = useState(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  const [notifQuery, setNotifQuery] = useState("");

  const [showPayments, setShowPayments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  const [seenBookingIds, setSeenBookingIds] = useState([]);
  const [seenReviewIds, setSeenReviewIds] = useState([]);

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
    } catch {}
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

  const getTenantPhone = (b) =>
    b?.tenant_phone ||
    b?.tenant?.phone ||
    b?.phone ||
    "";

  const getTenantDisplay = (b) =>
    getTenantEmail(b) || getTenantName(b) || "Tenant";

  const getListingTitle = (b) =>
    b?.listing_title ||
    b?.listing?.title ||
    b?.property_title ||
    b?.property?.title ||
    "Property";

  const getFirstMessage = (b) =>
    b?.first_message || b?.message || b?.text || b?.latest_message || "";

  const formatDate = (s) => {
    if (!s) return "";
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return String(s);
      return d.toLocaleString();
    } catch {
      return String(s);
    }
  };

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
    if (kind === "booking") return "📅 Booking";
    if (kind === "provider") return "🧰 Provider";
    if (kind === "review") return "⭐ Review";
    return "🔔 General";
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
      return `${group.sender} sent ${group.count} booking notification${
        group.count > 1 ? "s" : ""
      } to you.`;
    }

    if (group.kind === "provider") {
      return `${group.sender} sent ${group.count} provider notification${
        group.count > 1 ? "s" : ""
      } to you.`;
    }

    if (group.kind === "review") {
      return `${group.sender} sent ${group.count} review notification${
        group.count > 1 ? "s" : ""
      } to you.`;
    }

    return `${group.sender} sent ${group.count} notification${
      group.count > 1 ? "s" : ""
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
    p?.listing_title ||
    p?.listing?.title ||
    p?.property_title ||
    "Property";
  const getPaymentStatus = (p) =>
    String(p?.payment_status || p?.status || "PENDING").toUpperCase();
  const getPaymentDate = (p) =>
    p?.verified_at || p?.created_at || p?.payment_date || "";

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
      errors.push(
        `All 6 photos for 360° view required. Missing: ${missing.join(", ")}`
      );
    }

    const okImage = (f) => f && f.type && f.type.startsWith("image/");
    if (coverImage && !okImage(coverImage)) {
      errors.push("Cover image must be an image file.");
    }

    Object.entries(pano).forEach(([k, f]) => {
      if (f && !okImage(f)) errors.push(`${k.toUpperCase()} must be an image file.`);
    });

    if (!form.latitude || !form.longitude) {
      errors.push(
        "Please pick the property location on the map (latitude/longitude required)."
      );
    }

    return { ok: errors.length === 0, errors };
  }, [form, coverImage, pano]);

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

      const ids = list
        .map((r, idx) => String(getReviewId(r, idx)))
        .filter(Boolean);

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
      const unreadIds = unread
        .map((n, idx) => String(getNotifId(n, idx)))
        .filter(Boolean);

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
        setPaymentsError(
          err?.response?.data?.detail || "Failed to load payment records."
        );
      }
      setPayments([]);
    } finally {
      if (!silent) setPaymentsLoading(false);
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
      } catch {
        // try next endpoint
      }
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
      const ids = (reviews || []).map((r, idx) => getReviewId(r, idx)).filter(Boolean);
      markReviewsSeen(ids);
      setShowReviews(true);
      setShowNotifications(false);
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

  const goHome = () => {
    nav("/");
  };

  useEffect(() => {
    setSeenBookingIds(loadSeenIds(bookingSeenKey));
    setSeenReviewIds(loadSeenIds(reviewSeenKey));
  }, [bookingSeenKey, reviewSeenKey]);

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
    const savedRole = (
      localStorage.getItem("role") ||
      savedUser?.role ||
      ""
    )
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

    const inboxInterval = setInterval(() => loadInbox(true), 5000);
    const notifInterval = setInterval(() => loadNotifications(true), 5000);
    const reviewInterval = setInterval(() => loadReviews(true), 5000);
    const paymentInterval = setInterval(() => loadPayments(true), 5000);

    return () => {
      clearInterval(inboxInterval);
      clearInterval(notifInterval);
      clearInterval(reviewInterval);
      clearInterval(paymentInterval);
      if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
      if (reviewToastTimerRef.current) clearTimeout(reviewToastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      setToast({ type: "success", msg: "Property posted successfully! ✅" });

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

  const completedPaymentCount = useMemo(() => {
    return (payments || []).filter(
      (p) => String(p?.payment_status || p?.status || "").toUpperCase() === "COMPLETE"
    ).length;
  }, [payments]);

  const latestRequests = useMemo(() => {
    const list = [...(requests || [])];
    list.sort((a, b) =>
      String(b?.created_at || "").localeCompare(String(a?.created_at || ""))
    );
    return list.slice(0, 3);
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
      String(getNotifCreatedAt(b) || "").localeCompare(String(getNotifCreatedAt(a) || ""))
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

  const filteredNotifGroups = useMemo(() => {
    const q = String(notifQuery || "").trim().toLowerCase();
    if (!q) return groupedNotifications;
    return groupedNotifications.filter((g) =>
      String(g.searchText || "").toLowerCase().includes(q)
    );
  }, [groupedNotifications, notifQuery]);

  const bookingNotifGroups = useMemo(
    () => filteredNotifGroups.filter((g) => g.kind === "booking"),
    [filteredNotifGroups]
  );

  const providerNotifGroups = useMemo(
    () => filteredNotifGroups.filter((g) => g.kind === "provider"),
    [filteredNotifGroups]
  );

  const reviewNotifGroups = useMemo(
    () => filteredNotifGroups.filter((g) => g.kind === "review"),
    [filteredNotifGroups]
  );

  const otherNotifGroups = useMemo(
    () => filteredNotifGroups.filter((g) => g.kind === "other"),
    [filteredNotifGroups]
  );

  const sectionHeading = (title, right = null) => (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className={`text-lg font-bold ${ui.sectionTitle}`}>{title}</h2>
      {right}
    </div>
  );

  const NearbyList = ({ title, items }) => (
    <div className={`${ui.softCard} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={`text-sm font-semibold ${ui.sectionTitle}`}>{title}</div>
        <div className={`text-xs ${ui.muted}`}>{items.length}</div>
      </div>

      {items.length === 0 ? (
        <div className={`text-sm ${ui.muted}`}>No places found.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((it) => (
            <div key={it.id} className={`${ui.softCard} p-3`}>
              <div className={`text-sm font-semibold ${ui.sectionTitle}`}>{it.name}</div>
              <div className={`mt-1 text-xs ${ui.subtext}`}>
                {it.kind ? `Type: ${it.kind} • ` : ""}
                Distance: {kmOrM(it.distance_m)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const NotificationSection = ({ title, items, emptyText }) => (
    <div className={`${ui.softCard} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={`text-sm font-semibold ${ui.sectionTitle}`}>{title}</div>
        <div className={`text-xs ${ui.muted}`}>{items.length}</div>
      </div>

      {items.length === 0 ? (
        <div className={`text-sm ${ui.muted}`}>{emptyText}</div>
      ) : (
        <div className="grid gap-3">
          {items.map((group) => {
            const unread = group.unreadCount > 0;

            return (
              <button
                key={group.key}
                onClick={() => openNotificationGroup(group)}
                className={`rounded-2xl border p-4 text-left transition ${
                  unread
                    ? isDark
                      ? "border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/15"
                      : "border-purple-200 bg-purple-50 hover:bg-purple-100"
                    : isDark
                    ? "border-white/10 bg-black/20 hover:bg-white/10"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
                title="Open notification"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`line-clamp-1 text-sm font-semibold ${ui.sectionTitle}`}>
                        {getGroupedTitle(group)}
                      </div>

                      <span
                        className={`rounded-full border px-2 py-[2px] text-[10px] font-bold ${getNotifKindClasses(
                          group.latest
                        )}`}
                      >
                        {getNotifKindLabel(group.latest)}
                      </span>

                      {unread ? (
                        <span
                          className={`rounded-full px-2 py-[2px] text-[10px] font-bold ${
                            isDark
                              ? "bg-purple-500/70 text-white"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          {group.unreadCount} NEW
                        </span>
                      ) : null}
                    </div>

                    <div className={`mt-2 text-sm font-medium ${ui.subtext}`}>
                      {group.sender}
                    </div>

                    <div className={`mt-1 whitespace-pre-wrap text-sm ${ui.subtext}`}>
                      {getGroupedBody(group)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className={`text-[11px] ${ui.muted}`}>
                      {formatDate(getNotifCreatedAt(group.latest))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Shell title="" subtitle="" right={null}>
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      <div className={ui.page}>
        <div className="mx-auto w-full max-w-[1750px] px-6 py-8 sm:px-8 lg:px-10">
          <div className={`mb-8 p-8 sm:p-10 lg:p-12 ${ui.hero}`}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
                    Owner Panel
                  </div>
                  <div
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                      isDark
                        ? "border-white/10 bg-white/5 text-slate-200"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    Dashboard Overview
                  </div>
                </div>

                <h1 className={`mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl ${ui.title}`}>
                  Owner Dashboard
                </h1>

                <p className={`mt-3 max-w-3xl text-sm sm:text-base ${ui.subtext}`}>
                  Welcome <span className="font-semibold">{displayEmail}</span>. Manage
                  your profile, properties, tenant requests, reviews, notifications,
                  payments, and maintenance in one place.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
                      Messages
                    </div>
                    <div className={`mt-2 text-2xl font-extrabold ${ui.title}`}>
                      {loadingMsgs ? "..." : unreadBookingCount}
                    </div>
                    <div className={`mt-1 text-sm ${ui.subtext}`}>
                      Unread tenant requests
                    </div>
                  </div>

                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
                      Reviews
                    </div>
                    <div className={`mt-2 text-2xl font-extrabold ${ui.title}`}>
                      {reviewsLoading ? "..." : unreadReviewCount}
                    </div>
                    <div className={`mt-1 text-sm ${ui.subtext}`}>New tenant reviews</div>
                  </div>

                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
                      Notifications
                    </div>
                    <div className={`mt-2 text-2xl font-extrabold ${ui.title}`}>
                      {notifLoading ? "..." : unreadNotifCount}
                    </div>
                    <div className={`mt-1 text-sm ${ui.subtext}`}>Unread updates</div>
                  </div>

                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
                      Payments
                    </div>
                    <div className={`mt-2 text-2xl font-extrabold ${ui.title}`}>
                      {paymentsLoading ? "..." : completedPaymentCount}
                    </div>
                    <div className={`mt-1 text-sm ${ui.subtext}`}>Completed records</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={ui.button}
                >
                  {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
                </button>

                <button onClick={handleLogout} className={ui.dangerButton}>
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              <button onClick={goHome} className={ui.button}>
                🏠 Home
              </button>

              <button
                onClick={() => nav("/owner/my-properties")}
                className={ui.button}
              >
                🏘️ My Properties
              </button>

              <button
                onClick={() => setShowAddProperty((s) => !s)}
                className={showAddProperty ? ui.primaryButton : ui.button}
              >
                {showAddProperty ? "✖ Close Add Property" : "➕ Add Property"}
              </button>

              <button
                onClick={() => {
                  markBookingsSeen(
                    (requests || []).map((r) => getBookingId(r)).filter(Boolean)
                  );
                  nav("/owner/messages");
                }}
                className={`${ui.button} flex items-center justify-center gap-2`}
              >
                <span>💬 Messages</span>
                <span
                  className={`inline-flex min-w-[28px] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-extrabold ${ui.badgeBlue}`}
                >
                  {loadingMsgs ? "..." : unreadBookingCount}
                </span>
              </button>

              <button
                onClick={() => {
                  const next = !showReviews;
                  setShowReviews(next);

                  if (!showReviews) {
                    markReviewsSeen(
                      (reviews || [])
                        .map((r, idx) => getReviewId(r, idx))
                        .filter(Boolean)
                    );
                  }
                }}
                className={`flex items-center justify-center gap-2 ${
                  showReviews ? ui.primaryButton : ui.button
                }`}
              >
                <span>⭐ Reviews</span>
                <span
                  className={`inline-flex min-w-[28px] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-extrabold ${ui.badgeAmber}`}
                >
                  {reviewsLoading ? "..." : unreadReviewCount}
                </span>
              </button>

              <button
                onClick={() => setShowNotifications((s) => !s)}
                className={`flex items-center justify-center gap-2 ${
                  showNotifications ? ui.primaryButton : ui.button
                }`}
              >
                <span>🔔 Notifications</span>
                <span
                  className={`inline-flex min-w-[28px] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-extrabold ${ui.badgePurple}`}
                >
                  {notifLoading ? "..." : unreadNotifCount}
                </span>
              </button>

              <button
                onClick={() => setShowPayments((s) => !s)}
                className={`flex items-center justify-center gap-2 ${
                  showPayments ? ui.primaryButton : ui.successButton
                }`}
              >
                <span>💰 Payments</span>
                <span
                  className={`inline-flex min-w-[28px] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-extrabold ${ui.badgeGreen}`}
                >
                  {paymentsLoading ? "..." : completedPaymentCount}
                </span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              <button
                onClick={() => nav("/owner/maintenance")}
                className={ui.successButton}
              >
                🧰 Maintenance
              </button>
            </div>
          </div>

          {showPayments ? (
            <div className={`${ui.card} mb-6 p-6`}>
              {sectionHeading("Payment Records")}

              {paymentsLoading ? (
                <p className={`text-sm ${ui.subtext}`}>Loading payment records...</p>
              ) : paymentsError ? (
                <p className="text-sm text-red-500">{paymentsError}</p>
              ) : payments.length === 0 ? (
                <p className={`text-sm ${ui.subtext}`}>No payment records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                    <thead
                      className={
                        isDark ? "bg-white/5 text-slate-200" : "bg-slate-50 text-slate-700"
                      }
                    >
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Tenant</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Property</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, idx) => {
                        const status = getPaymentStatus(p);
                        const badge =
                          status === "COMPLETE"
                            ? ui.badgeGreen
                            : status === "REJECTED"
                            ? ui.badgeRed
                            : ui.badgeAmber;

                        return (
                          <tr
                            key={getPaymentId(p, idx)}
                            className={
                              isDark
                                ? "border-t border-white/10"
                                : "border-t border-slate-200"
                            }
                          >
                            <td className={`px-4 py-3 text-sm ${ui.subtext}`}>
                              {getPaymentTenant(p)}
                            </td>
                            <td className={`px-4 py-3 text-sm ${ui.subtext}`}>
                              {getPaymentListing(p)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${badge}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm ${ui.subtext}`}>
                              {formatDate(getPaymentDate(p))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {showNotifications ? (
            <div className={`${ui.card} mb-6 p-6`}>
              {sectionHeading(
                "Notifications",
                <input
                  value={notifQuery}
                  onChange={(e) => setNotifQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className={`${ui.input} max-w-sm`}
                />
              )}

              {notifLoading ? (
                <p className={`text-sm ${ui.subtext}`}>Loading notifications...</p>
              ) : notifError ? (
                <p className="text-sm text-red-500">{notifError}</p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  <NotificationSection
                    title="Booking Notifications"
                    items={bookingNotifGroups}
                    emptyText="No booking notifications."
                  />
                  <NotificationSection
                    title="Provider Notifications"
                    items={providerNotifGroups}
                    emptyText="No provider notifications."
                  />
                  <NotificationSection
                    title="Review Notifications"
                    items={reviewNotifGroups}
                    emptyText="No review notifications."
                  />
                  <NotificationSection
                    title="Other Notifications"
                    items={otherNotifGroups}
                    emptyText="No general notifications."
                  />
                </div>
              )}
            </div>
          ) : null}

          {showReviews ? (
            <div className={`${ui.card} mb-6 p-6`}>
              {sectionHeading(
                "Reviews",
                <input
                  value={reviewQuery}
                  onChange={(e) => setReviewQuery(e.target.value)}
                  placeholder="Search reviews..."
                  className={`${ui.input} max-w-sm`}
                />
              )}

              {reviewsLoading ? (
                <p className={`text-sm ${ui.subtext}`}>Loading reviews...</p>
              ) : reviewsError ? (
                <p className="text-sm text-red-500">{reviewsError}</p>
              ) : filteredReviews.length === 0 ? (
                <p className={`text-sm ${ui.subtext}`}>No reviews found.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredReviews.map((r, idx) => (
                    <div key={getReviewId(r, idx)} className={`${ui.softCard} p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className={`text-base font-semibold ${ui.sectionTitle}`}>
                            {getReviewListingTitle(r)}
                          </div>
                          <div className={`mt-1 text-sm ${ui.subtext}`}>
                            From: {getReviewTenant(r)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-bold text-amber-500">
                            {starString(getReviewRating(r))}
                          </div>
                          <div className={`mt-1 text-xs ${ui.muted}`}>
                            {formatDate(getReviewCreatedAt(r))}
                          </div>
                        </div>
                      </div>

                      <div className={`mt-3 whitespace-pre-wrap text-sm ${ui.subtext}`}>
                        {getReviewComment(r) || "—"}
                      </div>

                      {r?.owner_reply ? (
                        <div className={`${ui.softCard} mt-3 p-3`}>
                          <div className={`text-xs font-semibold ${ui.sectionTitle}`}>
                            Owner reply
                          </div>
                          <div className={`mt-1 whitespace-pre-wrap text-sm ${ui.subtext}`}>
                            {String(r.owner_reply)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`${ui.card} p-6`}>
              {sectionHeading("My Profile")}

              {!profile ? (
                <p className={`text-sm ${ui.subtext}`}>Loading...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase ${ui.muted}`}>Owner ID</div>
                    <div className={`mt-1 text-sm font-medium ${ui.subtext}`}>
                      {profile.id ?? "-"}
                    </div>
                  </div>

                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase ${ui.muted}`}>Username</div>
                    <div className={`mt-1 text-sm font-medium ${ui.subtext}`}>
                      {profile.username ?? "-"}
                    </div>
                  </div>

                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase ${ui.muted}`}>Email</div>
                    <div className={`mt-1 text-sm font-medium ${ui.subtext}`}>
                      {profile.email ?? displayEmail ?? "-"}
                    </div>
                  </div>

                  <div className={`${ui.softCard} p-4`}>
                    <div className={`text-xs font-semibold uppercase ${ui.muted}`}>Phone</div>
                    <div className={`mt-1 text-sm font-medium ${ui.subtext}`}>
                      {profile.phone ?? "-"}
                    </div>
                  </div>

                  <div className={`${ui.softCard} p-4 sm:col-span-2`}>
                    <div className={`text-xs font-semibold uppercase ${ui.muted}`}>Address</div>
                    <div className={`mt-1 text-sm font-medium ${ui.subtext}`}>
                      {profile.address ?? "-"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`${ui.card} p-6`}>
              {sectionHeading(
                "Latest Tenant Requests",
                <button
                  onClick={() => {
                    markBookingsSeen(
                      (requests || []).map((r) => getBookingId(r)).filter(Boolean)
                    );
                    nav("/owner/messages");
                  }}
                  className={ui.button}
                >
                  View All
                </button>
              )}

              {loadingMsgs ? (
                <p className={`text-sm ${ui.subtext}`}>Loading requests...</p>
              ) : latestRequests.length === 0 ? (
                <p className={`text-sm ${ui.subtext}`}>No requests yet.</p>
              ) : (
                <div className="grid gap-3">
                  {latestRequests.map((b, idx) => {
                    const st = getStatus(b);
                    const badge =
                      st === "accepted"
                        ? ui.badgeGreen
                        : st === "rejected"
                        ? ui.badgeRed
                        : ui.badgeAmber;

                    return (
                      <div key={getBookingId(b) || idx} className={`${ui.softCard} p-4`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className={`text-base font-semibold ${ui.sectionTitle}`}>
                              {getListingTitle(b)}
                            </div>
                            <div className={`mt-1 text-sm ${ui.subtext}`}>
                              {getTenantDisplay(b)}
                            </div>
                            {getTenantPhone(b) ? (
                              <div className={`mt-1 text-sm ${ui.subtext}`}>
                                {getTenantPhone(b)}
                              </div>
                            ) : null}
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${badge}`}
                          >
                            {st.toUpperCase()}
                          </span>
                        </div>

                        <div className={`mt-3 text-sm ${ui.subtext}`}>
                          {getFirstMessage(b) || "No message"}
                        </div>

                        <div className={`mt-3 text-xs ${ui.muted}`}>
                          {formatDate(b?.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {showAddProperty ? (
            <div className={`${ui.card} mt-6 p-6`}>
              {sectionHeading("Add Property")}

              {!validation.ok ? (
                <div
                  className={`mb-4 rounded-2xl border p-4 ${
                    isDark
                      ? "border-red-500/20 bg-red-500/10"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-red-600">Please fix these:</div>
                  <ul className="mt-2 space-y-1 text-sm text-red-600">
                    {validation.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <form onSubmit={submitProperty} className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Title
                    </label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Property title"
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Property Type
                    </label>
                    <select
                      name="property_type"
                      value={form.property_type}
                      onChange={onChange}
                      className={ui.input}
                    >
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="flat">Flat</option>
                      <option value="room">Room</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={onChange}
                      rows={4}
                      className={ui.textarea}
                      placeholder="Describe your property..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Location
                    </label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Property location"
                    />
                    {geoLoading ? (
                      <div className={`mt-2 text-xs ${ui.muted}`}>Detecting address...</div>
                    ) : null}
                    {place.display ? (
                      <div className={`mt-2 text-xs ${ui.subtext}`}>
                        Detected: {place.display}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Price Per Month
                    </label>
                    <input
                      name="price_per_month"
                      value={form.price_per_month}
                      onChange={onChange}
                      type="number"
                      className={ui.input}
                      placeholder="Monthly rent"
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Electricity Bill
                    </label>
                    <input
                      name="electricity_bill"
                      value={form.electricity_bill}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Electricity bill"
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Contact Number
                    </label>
                    <input
                      name="owner_contact_number"
                      value={form.owner_contact_number}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Contact Email
                    </label>
                    <input
                      name="owner_contact_email"
                      value={form.owner_contact_email}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Email address"
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Latitude
                    </label>
                    <input
                      name="latitude"
                      value={form.latitude}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Latitude"
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Longitude
                    </label>
                    <input
                      name="longitude"
                      value={form.longitude}
                      onChange={onChange}
                      className={ui.input}
                      placeholder="Longitude"
                    />
                  </div>
                </div>

                <div className={`${ui.softCard} p-4`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className={`text-base font-semibold ${ui.sectionTitle}`}>
                        Pick Property Location
                      </div>
                      <div className={`text-sm ${ui.subtext}`}>
                        Click on the map to set latitude and longitude.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={clearPicked}
                        className={ui.button}
                      >
                        Clear Picked Location
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                    <LocationPicker value={picked} onPick={onPick} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Cover Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                      className={ui.input}
                    />
                    {coverImage ? (
                      <div className={`mt-2 text-xs ${ui.subtext}`}>{coverImage.name}</div>
                    ) : null}
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${ui.sectionTitle}`}>
                      Nearby Search Radius
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className={`mt-2 text-xs ${ui.subtext}`}>
                      Radius: {kmOrM(radius)}
                    </div>
                    {nearbyLoading ? (
                      <div className={`mt-1 text-xs ${ui.muted}`}>Loading nearby places...</div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className={`mb-3 text-base font-semibold ${ui.sectionTitle}`}>
                    360° Images
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {["front", "back", "left", "right", "up", "down"].map((side) => (
                      <div key={side}>
                        <label className={`mb-2 block text-sm font-semibold capitalize ${ui.sectionTitle}`}>
                          {side}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onPanoChange(side, e.target.files?.[0] || null)}
                          className={ui.input}
                        />
                        {pano[side] ? (
                          <div className={`mt-2 text-xs ${ui.subtext}`}>{pano[side].name}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <NearbyList title="Schools" items={nearby.schools} />
                  <NearbyList title="Colleges / Universities" items={nearby.colleges} />
                  <NearbyList title="Hospitals / Clinics" items={nearby.hospitals} />
                  <NearbyList title="Markets" items={nearby.markets} />
                  <NearbyList title="Bus Stops" items={nearby.bus} />
                  <NearbyList title="ATMs" items={nearby.atms} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={posting}
                    className={posting ? ui.warningButton : ui.primaryButton}
                  >
                    {posting ? "Posting..." : "Post Property"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddProperty(false)}
                    className={ui.button}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}