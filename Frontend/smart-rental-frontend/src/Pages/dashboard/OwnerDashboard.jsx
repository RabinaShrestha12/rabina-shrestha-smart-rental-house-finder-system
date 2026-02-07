// src/pages/dashboard/OwnerDashboard.jsx
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

export default function OwnerDashboard() {
  const { role, email, logout } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });

  // profile
  const [profile, setProfile] = useState(null);

  // show/hide property form
  const [showAddProperty, setShowAddProperty] = useState(false);

  // booking requests inbox
  const [requests, setRequests] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ✅ REVIEWS
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");

  // ✅ NOTIFICATIONS
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  const [notifQuery, setNotifQuery] = useState("");

  // ---- PROPERTY FORM STATE ----
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

  // map-picked marker
  const [picked, setPicked] = useState(null); // {lat, lng}

  // Cover + 360 files
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

  // Address details (Nominatim)
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

  // Nearby places (Overpass)
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [radius, setRadius] = useState(1200); // meters
  const [nearby, setNearby] = useState({
    schools: [],
    colleges: [],
    hospitals: [],
    markets: [],
    bus: [],
    atms: [],
  });

  // Avoid spamming APIs on repeated clicks quickly
  const inFlightRef = useRef({ nominatim: null, overpass: null });

  // ---------------------------
  // Helpers
  // ---------------------------
  const arrify = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk;
  const getStatus = (b) => (b?.status ?? b?.state ?? "pending").toLowerCase();
  const getTenantEmail = (b) =>
    b?.tenant_email ||
    b?.tenant?.email ||
    b?.tenant_username ||
    b?.tenant?.username ||
    "Tenant";
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

  // ✅ Review helpers
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

  // ✅ Notification helpers
  const getNotifId = (n, idx) => n?.id ?? n?.notification_id ?? n?.pk ?? `${idx}`;
  const getNotifTitle = (n) => n?.title ?? n?.subject ?? n?.type ?? "Notification";
  const getNotifBody = (n) => n?.message ?? n?.body ?? n?.text ?? n?.detail ?? "";
  const getNotifCreatedAt = (n) =>
    n?.created_at || n?.created || n?.timestamp || n?.date || "";
  const isNotifUnread = (n) => {
    const v = n?.is_read ?? n?.read ?? n?.seen;
    if (v === undefined || v === null) return false;
    return !Boolean(v);
  };

  // ---------------------------
  // Validation helpers
  // ---------------------------
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

    if (!form.owner_contact_number.trim())
      errors.push("Owner contact number is required.");
    else if (!isPhone(form.owner_contact_number))
      errors.push("Owner contact number looks invalid.");

    if (form.owner_contact_email && !isEmail(form.owner_contact_email))
      errors.push("Owner contact email looks invalid.");

    if (!coverImage) errors.push("Cover image is required.");

    const missing = missing360Sides();
    if (missing.length) {
      errors.push(
        `All 6 photos for 360° view required. Missing: ${missing.join(", ")}`
      );
    }

    const okImage = (f) => f && f.type && f.type.startsWith("image/");
    if (coverImage && !okImage(coverImage))
      errors.push("Cover image must be an image file.");

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

  // ---------------------------
  // Guard + Load profile + inbox
  // ---------------------------
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return nav("/auth", { replace: true });
    if (role !== "owner") return nav("/unauthorized", { replace: true });

    const loadProfile = async () => {
      try {
        const res = await api.get("owner-profile/");
        const data = res.data || {};
        const ownerObj = data.owner || data;
        setProfile(ownerObj);
      } catch (err) {
        const m =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load owner profile.";
        setToast({ type: "error", msg: m });
      }
    };

    const loadInbox = async () => {
      setLoadingMsgs(true);
      try {
        const res = await api.get("owner/booking-requests/");
        setRequests(arrify(res.data));
      } catch {
        setRequests([]);
      } finally {
        setLoadingMsgs(false);
      }
    };

    loadProfile();
    loadInbox();
  }, [role, nav]);

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  // ---------------------------
  // ✅ Reviews loader
  // ---------------------------
  const loadReviews = async () => {
    setReviewsLoading(true);
    setReviewsError("");
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
      } else {
        setReviews(arrify(data));
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (showReviews) loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReviews]);

  // ---------------------------
  // ✅ Notifications loader
  // ---------------------------
  const loadNotifications = async () => {
    setNotifLoading(true);
    setNotifError("");
    try {
      const endpoints = [
        "owner/notifications/",
        "owner/notifications",
        "notifications/owner/",
        "notifications/owner",
        "notifications/",
        "notifications",
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
          "Notifications API not found. Please create GET /api/owner/notifications/.";
        setNotifError(m);
        setNotifications([]);
      } else {
        setNotifications(arrify(data));
      }
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (showNotifications) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications]);

  // mark notification read (optional)
  const markNotificationRead = async (notif) => {
    const id = notif?.id ?? notif?.notification_id ?? notif?.pk;
    if (!id) return;

    const endpoints = [
      `owner/notifications/${id}/read/`,
      `owner/notifications/${id}/read`,
      `notifications/${id}/read/`,
      `notifications/${id}/read`,
      `owner/notifications/${id}/`,
      `notifications/${id}/`,
    ];

    for (const ep of endpoints) {
      try {
        await api.patch(ep, { is_read: true });
        setNotifications((prev) =>
          (prev || []).map((n) => {
            const nid = n?.id ?? n?.notification_id ?? n?.pk;
            if (String(nid) === String(id))
              return { ...n, is_read: true, read: true, seen: true };
            return n;
          })
        );
        return;
      } catch {
        // try next
      }
    }
  };

  // ---------------------------
  // Form handlers
  // ---------------------------
  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  const onPanoChange = (side, file) => setPano((s) => ({ ...s, [side]: file }));

  // ---------------------------
  // Reverse Geocode (Nominatim)
  // ---------------------------
  async function reverseGeocode(lat, lng) {
    if (inFlightRef.current.nominatim?.abort)
      inFlightRef.current.nominatim.abort();
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

  // ---------------------------
  // Nearby Places (Overpass)
  // ---------------------------
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
    if (inFlightRef.current.overpass?.abort) inFlightRef.current.overpass.abort();
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
        else if (amenity === "college" || amenity === "university")
          colleges.push(it);
        else if (amenity === "hospital" || amenity === "clinic")
          hospitals.push(it);
        else if (shop === "supermarket" || amenity === "marketplace")
          markets.push(it);
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

  // Map pick handler
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

  useEffect(() => {
    if (!form.latitude || !form.longitude) return;
    fetchNearbyPlaces(form.latitude, form.longitude, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  // ---------------------------
  // Submit property
  // ---------------------------
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

  // ---------------------------
  // Derived UI info
  // ---------------------------
  const pendingCount = useMemo(
    () => (requests || []).filter((r) => getStatus(r) === "pending").length,
    [requests]
  );

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

  const filteredNotifs = useMemo(() => {
    const q = String(notifQuery || "").trim().toLowerCase();
    const list = [...(notifications || [])];
    list.sort((a, b) =>
      String(getNotifCreatedAt(b) || "").localeCompare(
        String(getNotifCreatedAt(a) || "")
      )
    );
    if (!q) return list;
    return list.filter((n) => {
      const t = `${getNotifTitle(n)} ${getNotifBody(n)}`.toLowerCase();
      return t.includes(q);
    });
  }, [notifications, notifQuery]);

  const unreadNotifCount = useMemo(
    () => (notifications || []).filter((n) => isNotifUnread(n)).length,
    [notifications]
  );

  const NearbySection = ({ title, items }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-sm text-slate-300">No results found.</div>
      ) : (
        <div className="mt-3 grid gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="text-sm text-white font-semibold">{it.name}</div>
              <div className="mt-1 text-xs text-slate-300">
                {it.kind ? `Type: ${it.kind} • ` : ""}
                Distance: {kmOrM(it.distance_m)}
              </div>
            </div>
          ))}
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

      {/* ✅ CLEAN HEADER (FIXED ACTION BAR) */}
      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        {/* Top row: Title + Logout */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-white">
              Owner Dashboard
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Welcome{" "}
              <span className="text-slate-200">{email || "Owner"}</span>. Manage
              your profile and properties.
            </div>
          </div>

          {/* Logout always visible */}
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/15 transition"
          >
            Logout
          </button>
        </div>

        {/* Action bar: wrapped on desktop, scroll on mobile */}
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            <button
              onClick={() => nav("/")}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
            >
              🏠 Home
            </button>

            <button
              onClick={() => nav("/owner/my-properties")}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
            >
              🏘️ My Properties
            </button>

            <button
              onClick={() => setShowAddProperty((s) => !s)}
              className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-extrabold transition ${
                showAddProperty
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-100 hover:bg-blue-500/20"
                  : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              }`}
            >
              {showAddProperty ? "✖ Close Add Property" : "➕ Add Property"}
            </button>

            <button
              onClick={() => nav("/owner/messages")}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
              title="View booking requests + chat"
            >
              💬 Messages
              <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-blue-500/80 px-2 py-[2px] text-[11px] font-extrabold text-white">
                {loadingMsgs ? "..." : pendingCount}
              </span>
            </button>

            <button
              onClick={() => setShowReviews((s) => !s)}
              className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                showReviews
                  ? "border-amber-400/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/20"
                  : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              }`}
              title="See tenant reviews for your properties"
            >
              ⭐ Reviews
              <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-amber-500/80 px-2 py-[2px] text-[11px] font-extrabold text-white">
                {reviewsLoading ? "..." : reviews?.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => setShowNotifications((s) => !s)}
              className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                showNotifications
                  ? "border-purple-400/30 bg-purple-500/15 text-purple-100 hover:bg-purple-500/20"
                  : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              }`}
              title="Notifications (rent / water / electricity / system)"
            >
              🔔 Notifications
              <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-purple-500/80 px-2 py-[2px] text-[11px] font-extrabold text-white">
                {notifLoading ? "..." : unreadNotifCount}
              </span>
            </button>

            <button
              onClick={() => nav("/owner/maintenance")}
              className="shrink-0 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15 transition"
              title="Open maintenance & service requests"
            >
              🧰 Maintenance
            </button>
          </div>

          <div className="mt-1 text-[11px] text-slate-400 sm:hidden">
            Tip: swipe left/right for more actions
          </div>
        </div>
      </div>

      {/* ✅ NOTIFICATIONS PANEL */}
      {showNotifications && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">
              🔔 Notifications
            </div>

            <div className="flex items-center gap-2">
              <input
                value={notifQuery}
                onChange={(e) => setNotifQuery(e.target.value)}
                placeholder="Search notifications"
                className="w-[260px] max-w-[70vw] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />
              <button
                onClick={loadNotifications}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowNotifications(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>

          {notifError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">
                Notifications not loading
              </div>
              <div className="mt-1 text-sm text-red-100/90">{notifError}</div>
            </div>
          ) : notifLoading ? (
            <div className="mt-4 text-sm text-slate-300">
              Loading notifications...
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="mt-4 text-sm text-slate-300">
              No notifications found.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredNotifs.map((n, idx) => {
                const unread = isNotifUnread(n);
                return (
                  <button
                    key={getNotifId(n, idx)}
                    onClick={() => markNotificationRead(n)}
                    className={`text-left rounded-2xl border border-white/10 p-4 transition ${
                      unread
                        ? "bg-purple-500/10 hover:bg-purple-500/15"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                    title={unread ? "Click to mark as read" : "Read"}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-white font-semibold line-clamp-1">
                          {getNotifTitle(n)}
                          {unread ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-purple-500/70 px-2 py-[2px] text-[10px] font-bold text-white">
                              NEW
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-slate-200/90 whitespace-pre-wrap">
                          {getNotifBody(n) || "—"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-slate-400">
                          {formatDate(getNotifCreatedAt(n))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ REVIEWS PANEL */}
      {showReviews && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">
              ⭐ Tenant Reviews
            </div>

            <div className="flex items-center gap-2">
              <input
                value={reviewQuery}
                onChange={(e) => setReviewQuery(e.target.value)}
                placeholder="Search (property / tenant / comment / rating)"
                className="w-[260px] max-w-[70vw] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />
              <button
                onClick={loadReviews}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowReviews(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>

          {reviewsError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">
                Reviews not loading
              </div>
              <div className="mt-1 text-sm text-red-100/90">{reviewsError}</div>
            </div>
          ) : reviewsLoading ? (
            <div className="mt-4 text-sm text-slate-300">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="mt-4 text-sm text-slate-300">No reviews found.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredReviews.map((r, idx) => {
                const rating = getReviewRating(r);
                const stars = starString(rating);
                return (
                  <div
                    key={getReviewId(r, idx)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-white font-semibold line-clamp-1">
                          {getReviewListingTitle(r)}
                        </div>
                        <div className="mt-1 text-xs text-slate-300 line-clamp-1">
                          From: {getReviewTenant(r)}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {rating != null ? (
                          <div className="text-sm font-semibold text-amber-200">
                            {stars}{" "}
                            <span className="text-slate-300 font-normal">
                              ({Number(rating)}/5)
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No rating</div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-400">
                          {formatDate(getReviewCreatedAt(r))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-200/90 whitespace-pre-wrap">
                      {getReviewComment(r) || "—"}
                    </div>

                    {r?.owner_reply ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xs font-semibold text-slate-200">
                          Owner reply
                        </div>
                        <div className="mt-1 text-sm text-slate-200/90 whitespace-pre-wrap">
                          {String(r.owner_reply)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ CONTENT GRID */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="text-lg font-semibold text-white">My Profile</div>

          {!profile ? (
            <p className="mt-2 text-sm text-slate-300">Loading...</p>
          ) : (
            <div className="mt-4 text-sm text-slate-200 grid gap-2">
              <div>
                <b>Owner ID:</b> {profile.id ?? "-"}
              </div>
              <div>
                <b>Username:</b> {profile.username ?? "-"}
              </div>
              <div>
                <b>Email:</b> {profile.email ?? email ?? "-"}
              </div>
              <div>
                <b>Phone:</b> {profile.phone ?? "-"}
              </div>
              <div>
                <b>Address:</b> {profile.address ?? "-"}
              </div>
            </div>
          )}
        </div>

        {/* Latest requests */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">
              Latest Tenant Requests
            </div>
            <button
              onClick={() => nav("/owner/messages")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition text-slate-100"
            >
              View All
            </button>
          </div>

          {loadingMsgs ? (
            <p className="mt-2 text-sm text-slate-300">Loading requests...</p>
          ) : latestRequests.length === 0 ? (
            <p className="mt-2 text-sm text-slate-300">No requests yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {latestRequests.map((b, idx) => {
                const st = getStatus(b);
                const badge =
                  st === "accepted"
                    ? "bg-green-500/15 text-green-200 border-green-500/20"
                    : st === "rejected"
                    ? "bg-red-500/15 text-red-200 border-red-500/20"
                    : "bg-blue-500/15 text-blue-200 border-blue-500/20";

                return (
                  <button
                    key={getBookingId(b) ?? idx}
                    onClick={() => nav("/owner/messages")}
                    className="text-left rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white font-semibold line-clamp-1">
                        {getListingTitle(b)} • #{getBookingId(b) ?? "—"}
                      </div>
                      <span
                        className={`text-[11px] border px-2 py-[2px] rounded-full ${badge}`}
                      >
                        {st}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-300 line-clamp-1">
                      From: {getTenantEmail(b)}
                    </div>

                    <div className="mt-2 text-xs text-slate-200/90 line-clamp-2">
                      {getFirstMessage(b) || "—"}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400">
                      {formatDate(b?.created_at || b?.created || "")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✅ ADD PROPERTY */}
      {showAddProperty && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-semibold text-white">
              Post a Property (with 360° photos)
            </div>
            <div className="text-sm text-slate-300">
              Upload 1 cover image + 6 photos (front, back, left, right, up,
              down). Pick the location on map.
            </div>
          </div>

          {!validation.ok && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">
                Please fix these requirements:
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-red-100/90 space-y-1">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={submitProperty} className="mt-4 grid gap-3">
            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
              name="title"
              placeholder="Title (e.g., 2 Bedroom House near City)"
              value={form.title}
              onChange={onChange}
              required
            />

            <textarea
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={onChange}
              rows={3}
            />

            <div className="grid md:grid-cols-2 gap-3">
              <select
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
                name="property_type"
                value={form.property_type}
                onChange={onChange}
              >
                <option value="house">House</option>
                <option value="room">Room</option>
                <option value="apartment">Apartment</option>
              </select>

              <input
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
                name="location"
                placeholder="Location (auto filled from map, you can edit)"
                value={form.location}
                onChange={onChange}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
                name="price_per_month"
                type="number"
                placeholder="Price per month"
                value={form.price_per_month}
                onChange={onChange}
                required
              />

              <input
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
                name="electricity_bill"
                placeholder="Electricity bill (optional)"
                value={form.electricity_bill}
                onChange={onChange}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
                name="owner_contact_number"
                placeholder="Contact number"
                value={form.owner_contact_number}
                onChange={onChange}
                required
              />
              <input
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
                name="owner_contact_email"
                placeholder="Contact email (optional)"
                value={form.owner_contact_email}
                onChange={onChange}
              />
            </div>

            {/* MAP */}
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-semibold text-slate-200">
                  📍 Pick Property Location *
                </div>
                <button
                  type="button"
                  onClick={clearPicked}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10 transition"
                >
                  Clear Pin
                </button>
              </div>

              <div className="mt-1 text-xs text-slate-300">
                Click on the map to place the pin. Address + nearby facilities
                will load automatically.
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 overflow-hidden">
                <LocationPicker value={picked} onChange={onPick} height={320} />
              </div>

              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <input
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.latitude}
                  readOnly
                  placeholder="Latitude"
                />
                <input
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.longitude}
                  readOnly
                  placeholder="Longitude"
                />
              </div>
            </div>

            {/* Images */}
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-slate-200">
                🖼️ Cover image *
              </div>
              <input
                className="mt-2 block w-full text-slate-200"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-slate-200">
                🧊 360° Photos (6 sides) *
              </div>
              <div className="mt-3 grid md:grid-cols-3 gap-3">
                {["front", "back", "left", "right", "up", "down"].map((side) => (
                  <div
                    key={side}
                    className="rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="text-xs text-slate-200 mb-2">
                      {side.toUpperCase()}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPanoChange(side, e.target.files?.[0] || null)}
                      className="block w-full text-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={posting}
              className="mt-2 rounded-2xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 transition disabled:opacity-60"
            >
              {posting ? "Posting..." : "Post Property"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-400">
        Smart Rental • React + Django + JWT
      </div>
    </Shell>
  );
}
