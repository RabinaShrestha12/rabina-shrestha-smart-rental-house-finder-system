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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
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
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsError, setNotifsError] = useState("");

  // ✅ MAINTENANCE (owner sees tenant help requests)
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [maint, setMaint] = useState([]);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintError, setMaintError] = useState("");
  const [maintQuery, setMaintQuery] = useState("");

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

  // ✅ Fix dropdown “white list” on Windows/Chrome
  const selectStyleFix = `
    select option, select optgroup {
      background-color: #0b1220 !important;
      color: #ffffff !important;
    }
    select option:checked {
      background-color: #1f2937 !important;
      color: #ffffff !important;
    }
  `;

  // ---------------------------
  // Helpers
  // ---------------------------
  const arrify = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

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

  // ✅ Notification helpers (supports many backend shapes)
  const getNotifId = (n, idx) => n?.id ?? n?.pk ?? `${idx}`;
  const getNotifTitle = (n) => n?.title || n?.type || "Notification";
  const getNotifBody = (n) => n?.message || n?.body || n?.text || "";
  const getNotifCreated = (n) => n?.created_at || n?.created || n?.timestamp || "";
  const isUnread = (n) =>
    n?.is_read === false || n?.read === false || n?.seen === false;

  // ✅ Maintenance helpers (supports many backend shapes)
  const getMaintId = (m, idx) => m?.id ?? m?.pk ?? `${idx}`;
  const getMaintStatus = (m) =>
    String(m?.status ?? m?.state ?? "pending").toLowerCase();
  const getMaintListing = (m) =>
    m?.listing_title || m?.listing?.title || m?.property?.title || "Property";
  const getMaintTenant = (m) =>
    m?.tenant_email ||
    m?.tenant?.email ||
    m?.tenant_username ||
    m?.tenant?.username ||
    "Tenant";
  const getMaintCategory = (m) =>
    m?.category || m?.issue_type || m?.type || "Issue";
  const getMaintMsg = (m) =>
    m?.message || m?.description || m?.details || m?.text || "";
  const getMaintCreated = (m) => m?.created_at || m?.created || m?.timestamp || "";

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
      errors.push(`All 6 photos for 360° view required. Missing: ${missing.join(", ")}`);
    }

    const okImage = (f) => f && f.type && f.type.startsWith("image/");
    if (coverImage && !okImage(coverImage))
      errors.push("Cover image must be an image file.");

    Object.entries(pano).forEach(([k, f]) => {
      if (f && !okImage(f)) errors.push(`${k.toUpperCase()} must be an image file.`);
    });

    if (!form.latitude || !form.longitude) {
      errors.push("Please pick the property location on the map (latitude/longitude required).");
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
        setToast({ type: "error", msg: axiosErr(err, "Failed to load owner profile.") });
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
      const endpoints = ["owner/reviews/", "owner/reviews", "reviews/owner/", "reviews/owner"];
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
        setReviewsError(
          axiosErr(
            lastErr,
            "Reviews API not found. Create GET /api/owner/reviews/ endpoint."
          )
        );
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
  const loadNotifs = async () => {
    setNotifsLoading(true);
    setNotifsError("");
    try {
      const endpoints = ["notifications/", "notification/", "owner/notifications/", "notifications/owner/"];
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
        setNotifsError(
          axiosErr(lastErr, "Notifications API not found. Add GET /api/notifications/")
        );
        setNotifs([]);
      } else {
        setNotifs(arrify(data));
      }
    } finally {
      setNotifsLoading(false);
    }
  };

  // mark read (tries common endpoints)
  const markNotifRead = async (id) => {
    if (!id) return;
    const endpoints = ["notifications/mark-read/", "notifications/read/", "notification/read/"];
    for (const ep of endpoints) {
      try {
        await api.post(ep, { id });
        setNotifs((prev) =>
          (prev || []).map((n) => (String(getNotifId(n)) === String(id) ? { ...n, is_read: true, read: true, seen: true } : n))
        );
        return;
      } catch {
        // try next
      }
    }
  };

  useEffect(() => {
    if (showNotifs) loadNotifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifs]);

  // ---------------------------
  // ✅ Maintenance loader (owner)
  // ---------------------------
  const loadMaintenance = async () => {
    setMaintLoading(true);
    setMaintError("");
    try {
      const endpoints = ["maintenance/owner/", "owner/maintenance/", "maintenance/requests/owner/", "maintenance/requests/"];
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
        setMaintError(axiosErr(lastErr, "Maintenance API not found. Add GET /api/maintenance/owner/"));
        setMaint([]);
      } else {
        setMaint(arrify(data));
      }
    } finally {
      setMaintLoading(false);
    }
  };

  const updateMaintenanceStatus = async (reqId, newStatus) => {
    if (!reqId) return;
    const endpoints = [
      `maintenance/${reqId}/status/`,
      `maintenance/${reqId}/update/`,
      `maintenance/update/${reqId}/`,
      `owner/maintenance/${reqId}/status/`,
    ];

    for (const ep of endpoints) {
      try {
        await api.patch(ep, { status: newStatus });
        setMaint((prev) =>
          (prev || []).map((m) =>
            String(getMaintId(m)) === String(reqId) ? { ...m, status: newStatus } : m
          )
        );
        setToast({ type: "success", msg: "Maintenance status updated ✅" });
        return;
      } catch {
        // try next
      }
    }

    setToast({ type: "error", msg: "Could not update status. Check backend endpoint." });
  };

  useEffect(() => {
    if (showMaintenance) loadMaintenance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMaintenance]);

  // ---------------------------
  // Form handlers
  // ---------------------------
  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  const onPanoChange = (side, file) => setPano((s) => ({ ...s, [side]: file }));

  // ---------------------------
  // Reverse Geocode (Nominatim)
  // ---------------------------
  async function reverseGeocode(lat, lng) {
    if (inFlightRef.current.nominatim?.abort) inFlightRef.current.nominatim.abort();
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

      const nice = [p.road, p.suburb, p.city, p.state, p.country].filter(Boolean).join(", ");
      setForm((prev) => ({ ...prev, location: nice || prev.location }));
    } catch {
      setPlace({ display: "", road: "", suburb: "", city: "", state: "", country: "", postcode: "" });
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
      kind: tags.amenity || tags.shop || tags.highway || tags.tourism || tags.leisure || "",
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
        .map((x) => ({ ...x, distance_m: haversineMeters(latNum, lngNum, x.lat, x.lng) }))
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
      setNearby({ schools: [], colleges: [], hospitals: [], markets: [], bus: [], atms: [] });
    } finally {
      setNearbyLoading(false);
    }
  }

  // Map pick handler
  const onPick = ({ lat, lng }) => {
    const lat6 = Number(lat).toFixed(6);
    const lng6 = Number(lng).toFixed(6);

    setPicked({ lat: Number(lat6), lng: Number(lng6) });

    setForm((p) => ({ ...p, latitude: lat6, longitude: lng6 }));

    reverseGeocode(lat6, lng6);
    fetchNearbyPlaces(lat6, lng6, radius);
  };

  const clearPicked = () => {
    setPicked(null);
    setForm((p) => ({ ...p, latitude: "", longitude: "" }));
    setPlace({ display: "", road: "", suburb: "", city: "", state: "", country: "", postcode: "" });
    setNearby({ schools: [], colleges: [], hospitals: [], markets: [], bus: [], atms: [] });
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
      setToast({ type: "error", msg: validation.errors[0] || "Please fix form errors." });
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
      setPano({ front: null, back: null, left: null, right: null, up: null, down: null });
      clearPicked();
      setShowAddProperty(false);
    } catch (err) {
      setToast({
        type: "error",
        msg:
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          (err?.response?.data && JSON.stringify(err.response.data)) ||
          "Failed to post property.",
      });
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
    list.sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
    return list.slice(0, 3);
  }, [requests]);

  const filteredReviews = useMemo(() => {
    const q = String(reviewQuery || "").trim().toLowerCase();
    const list = [...(reviews || [])];
    list.sort((a, b) =>
      String(getReviewCreatedAt(b) || "").localeCompare(String(getReviewCreatedAt(a) || ""))
    );
    if (!q) return list;
    return list.filter((r) => {
      const t = `${getReviewListingTitle(r)} ${getReviewTenant(r)} ${getReviewComment(
        r
      )} ${getReviewRating(r) ?? ""}`.toLowerCase();
      return t.includes(q);
    });
  }, [reviews, reviewQuery]);

  const filteredMaint = useMemo(() => {
    const q = String(maintQuery || "").trim().toLowerCase();
    const list = [...(maint || [])];
    list.sort((a, b) => String(getMaintCreated(b)).localeCompare(String(getMaintCreated(a))));
    if (!q) return list;
    return list.filter((m) => {
      const t = `${getMaintListing(m)} ${getMaintTenant(m)} ${getMaintCategory(m)} ${getMaintMsg(m)} ${getMaintStatus(m)}`.toLowerCase();
      return t.includes(q);
    });
  }, [maint, maintQuery]);

  const unreadCount = useMemo(
    () => (notifs || []).filter((n) => isUnread(n)).length,
    [notifs]
  );

  const NearbySection = ({ title, items }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-sm text-slate-300">No results found.</div>
      ) : (
        <div className="mt-3 grid gap-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
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
      <style>{selectStyleFix}</style>

      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      {/* HEADER */}
      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-white">Owner Dashboard</div>
            <div className="mt-1 text-sm text-slate-300">
              Welcome <span className="text-slate-200">{email || "Owner"}</span>. Manage
              your profile and properties.
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 lg:pb-0">
              <button
                onClick={() => nav("/")}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                🏠 Home
              </button>

              <button
                onClick={() => nav("/owner/my-properties")}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                🏘️ My Property Details
              </button>

              <button
                onClick={() => setShowAddProperty((s) => !s)}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
              >
                {showAddProperty ? "✖ Close Add Property" : "➕ Add Property"}
              </button>

              <button
                onClick={() => nav("/owner/messages")}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                💬 Messages
                <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-blue-500/80 px-2 py-[2px] text-[11px] font-bold text-white">
                  {loadingMsgs ? "..." : pendingCount}
                </span>
              </button>

              <button
                onClick={() => setShowReviews((s) => !s)}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                ⭐ Reviews
                <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-amber-500/80 px-2 py-[2px] text-[11px] font-bold text-white">
                  {reviewsLoading ? "..." : reviews?.length ?? 0}
                </span>
              </button>

              {/* ✅ NEW: Notifications */}
              <button
                onClick={() => setShowNotifs((s) => !s)}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
                title="View notifications"
              >
                🔔 Notifications
                <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-purple-500/80 px-2 py-[2px] text-[11px] font-bold text-white">
                  {notifsLoading ? "..." : unreadCount}
                </span>
              </button>

              {/* ✅ NEW: Maintenance */}
              <button
                onClick={() => setShowMaintenance((s) => !s)}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
                title="Tenant help requests"
              >
                🔧 Maintenance
                <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-emerald-500/80 px-2 py-[2px] text-[11px] font-bold text-white">
                  {maintLoading ? "..." : maint?.length ?? 0}
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOTIFICATIONS PANEL */}
      {showNotifs && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">🔔 Notifications</div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadNotifs}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowNotifs(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>

          {notifsError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">Notifications not loading</div>
              <div className="mt-1 text-sm text-red-100/90">{notifsError}</div>
            </div>
          ) : notifsLoading ? (
            <div className="mt-4 text-sm text-slate-300">Loading notifications...</div>
          ) : (notifs?.length ?? 0) === 0 ? (
            <div className="mt-4 text-sm text-slate-300">No notifications.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {(notifs || []).map((n, idx) => {
                const id = getNotifId(n, idx);
                const unread = isUnread(n);
                return (
                  <div
                    key={id}
                    className={`rounded-2xl border p-4 ${
                      unread
                        ? "border-purple-500/25 bg-purple-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white line-clamp-1">
                          {getNotifTitle(n)}
                        </div>
                        <div className="mt-1 text-sm text-slate-200/90 whitespace-pre-wrap">
                          {getNotifBody(n) || "—"}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-400">
                          {formatDate(getNotifCreated(n))}
                        </div>
                      </div>

                      {unread ? (
                        <button
                          onClick={() => markNotifRead(id)}
                          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10 transition"
                        >
                          Mark read
                        </button>
                      ) : (
                        <span className="shrink-0 text-[11px] text-slate-400">Read</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ MAINTENANCE PANEL */}
      {showMaintenance && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">🔧 Maintenance Requests</div>
            <div className="flex items-center gap-2">
              <input
                value={maintQuery}
                onChange={(e) => setMaintQuery(e.target.value)}
                placeholder="Search (tenant / property / issue / status)"
                className="w-[240px] max-w-[70vw] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />
              <button
                onClick={loadMaintenance}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowMaintenance(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>

          {maintError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">Maintenance not loading</div>
              <div className="mt-1 text-sm text-red-100/90">{maintError}</div>
            </div>
          ) : maintLoading ? (
            <div className="mt-4 text-sm text-slate-300">Loading maintenance requests...</div>
          ) : filteredMaint.length === 0 ? (
            <div className="mt-4 text-sm text-slate-300">No maintenance requests found.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredMaint.map((m, idx) => {
                const id = getMaintId(m, idx);
                const st = getMaintStatus(m);

                const badge =
                  st === "resolved" || st === "done"
                    ? "bg-green-500/15 text-green-200 border-green-500/20"
                    : st === "in_progress"
                    ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
                    : "bg-blue-500/15 text-blue-200 border-blue-500/20";

                return (
                  <div key={id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white line-clamp-1">
                          {getMaintListing(m)}
                        </div>
                        <div className="mt-1 text-xs text-slate-300">
                          From: {getMaintTenant(m)} • Issue: {getMaintCategory(m)}
                        </div>
                      </div>

                      <span className={`text-[11px] border px-2 py-[2px] rounded-full ${badge}`}>
                        {st}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-200/90 whitespace-pre-wrap">
                      {getMaintMsg(m) || "—"}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400">
                      {formatDate(getMaintCreated(m))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={st}
                        onChange={(e) => updateMaintenanceStatus(id, e.target.value)}
                        className="appearance-none rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-slate-100"
                      >
                        <option value="pending">pending</option>
                        <option value="in_progress">in_progress</option>
                        <option value="resolved">resolved</option>
                        <option value="done">done</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ REVIEWS PANEL (same as you had) */}
      {showReviews && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">⭐ Tenant Reviews</div>

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
              <div className="text-sm font-semibold text-red-200">Reviews not loading</div>
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
                  <div key={getReviewId(r, idx)} className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                            <span className="text-slate-300 font-normal">({Number(rating)}/5)</span>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ CONTENT GRID (same as your code) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="text-lg font-semibold text-white">My Profile</div>
          {!profile ? (
            <p className="mt-2 text-sm text-slate-300">Loading...</p>
          ) : (
            <div className="mt-4 text-sm text-slate-200 grid gap-2">
              <div><b>Owner ID:</b> {profile.id ?? "-"}</div>
              <div><b>Username:</b> {profile.username ?? "-"}</div>
              <div><b>Email:</b> {profile.email ?? email ?? "-"}</div>
              <div><b>Phone:</b> {profile.phone ?? "-"}</div>
              <div><b>Address:</b> {profile.address ?? "-"}</div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-white">Latest Tenant Requests</div>
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
                      <span className={`text-[11px] border px-2 py-[2px] rounded-full ${badge}`}>
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

      {/* ✅ ADD PROPERTY (same as your code, keep it) */}
      {showAddProperty && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
          {/* ... keep your existing Add Property form exactly as you already have ... */}
          <div className="text-sm text-slate-300">
            (Your property form is unchanged. Keep your same form code here.)
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-400">
        Smart Rental • React + Django + JWT
      </div>
    </Shell>
  );
}
