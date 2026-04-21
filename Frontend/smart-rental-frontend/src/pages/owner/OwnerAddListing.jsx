import {
  ArrowLeft,
  Bath,
  Building2,
  Bus,
  Car,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Layout,
  MapPin,
  Maximize2,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  School,
  Star,
  Trash2,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function OwnerAddListing() {
  const { role, email } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigate();
  const isDark = theme === "dark";

  const ui = {
    pageBg: isDark
      ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a1a30] to-[#071120]"
      : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100",
    card: isDark
      ? "backdrop-blur-xl bg-[#10294d]/80 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      : "backdrop-blur-xl bg-white/70 border border-slate-200/60 shadow-[0_20px_50px_rgba(30,41,59,0.08)]",
    soft: isDark
      ? "bg-white/5 border border-white/10"
      : "bg-slate-100/50 border border-slate-200/50",
    input: isDark
      ? "bg-[#16345c]/50 border-white/10 text-white placeholder:text-slate-500 focus:bg-[#1c4276]/60 focus:border-blue-400/50"
      : "bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500/50",
    heading: isDark ? "text-white" : "text-slate-900",
    sub: isDark ? "text-slate-300" : "text-slate-600",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    accent: "text-blue-500",
    glassIcon: isDark ? "bg-blue-500/20 text-blue-300 border border-blue-500/20" : "bg-blue-50 text-blue-600 border border-blue-100",
    smallAction: isDark
      ? "bg-white/10 text-slate-200 hover:bg-white/15 border border-white/10"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
  };

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "house",
    location: "",
    price_per_month: "",
    electricity_bill: "",
    owner_contact_number: "",
    owner_contact_email: email || "",
    latitude: "",
    longitude: "",
  });

  const [coverImage, setCoverImage] = useState(null);
  const [pano, setPano] = useState({
    front: null,
    back: null,
    left: null,
    right: null,
    up: null,
    down: null,
  });

  const [extraSpaces, setExtraSpaces] = useState([]);
  const showExtraSpaces = ["house", "flat", "apartment"].includes(form.property_type);

  const [geoLoading, setGeoLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const [place, setPlace] = useState({ display: "" });

  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [radius, setRadius] = useState(1200);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [nearby, setNearby] = useState({
    schools: [],
    colleges: [],
    hospitals: [],
    markets: [],
    bus: [],
    atms: [],
  });

  const inFlightRef = useRef({ nominatim: null, overpass: null });

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onPanoChange = (side, file) =>
    setPano((s) => ({ ...s, [side]: file }));

  const addExtraSpace = () => {
    setExtraSpaces((prev) => [
      ...prev,
      {
        space_type: "bedroom",
        label: "",
        image: null,
      },
    ]);
  };

  const onExtraSpaceChange = (index, field, value) => {
    setExtraSpaces((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeExtraSpace = (index) => {
    setExtraSpaces((prev) => prev.filter((_, i) => i !== index));
  };

  // APIs
  async function reverseGeocode(lat, lng) {
    if (inFlightRef.current.nominatim?.abort) inFlightRef.current.nominatim.abort();
    const ctrl = new AbortController();
    inFlightRef.current.nominatim = ctrl;

    setGeoLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      const data = await res.json();
      setPlace({ display: data?.display_name || "Location picked" });

      const a = data?.address || {};
      const nice = [a.road || a.highway, a.suburb || a.neighbourhood, a.city || a.town, a.state, a.country]
        .filter(Boolean)
        .join(", ");

      setForm((prev) => ({ ...prev, location: nice || prev.location }));
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Geocoding failed", err);
      setPlace({ display: "Location selected" });
    } finally {
      setGeoLoading(false);
    }
  }

  async function fetchNearbyPlaces(lat, lng, r) {
    if (inFlightRef.current.overpass?.abort) inFlightRef.current.overpass.abort();
    const ctrl = new AbortController();
    inFlightRef.current.overpass = ctrl;

    setNearbyLoading(true);
    try {
      const q = `
[out:json][timeout:25];
(
  node(around:${r},${lat},${lng})["amenity"="school"];
  node(around:${r},${lat},${lng})["amenity"="college"];
  node(around:${r},${lat},${lng})["amenity"="university"];
  node(around:${r},${lat},${lng})["amenity"="hospital"];
  node(around:${r},${lat},${lng})["shop"="supermarket"];
  node(around:${r},${lat},${lng})["highway"="bus_stop"];
  node(around:${r},${lat},${lng})["amenity"="atm"];
);
out center;
      `.trim();

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        signal: ctrl.signal,
        body: q,
      });

      const json = await res.json();
      const els = (json?.elements || []).map((el) => {
        const t = el.tags || {};
        const itLat = el.lat || el.center?.lat;
        const itLng = el.lon || el.center?.lon;
        return {
          id: el.id,
          lat: itLat,
          lng: itLng,
          name: t.name || t["name:en"] || "Unnamed Facility",
          amenity: t.amenity,
          shop: t.shop,
          highway: t.highway,
          distance_m: haversineMeters(lat, lng, itLat, itLng)
        };
      }).sort((a,b) => a.distance_m - b.distance_m);

      const categorized = {
        schools: els.filter(e => e.amenity === "school"),
        colleges: els.filter(e => e.amenity === "college" || e.amenity === "university"),
        hospitals: els.filter(e => e.amenity === "hospital"),
        markets: els.filter(e => e.shop === "supermarket"),
        bus: els.filter(e => e.highway === "bus_stop"),
        atms: els.filter(e => e.amenity === "atm"),
      };

      setNearby(categorized);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Nearby fetch failed", err);
    } finally {
      setNearbyLoading(false);
    }
  }

  const onPick = ({ lat, lng }) => {
    const la = Number(lat).toFixed(6);
    const lo = Number(lng).toFixed(6);
    setPicked({ lat: Number(la), lng: Number(lo) });
    setForm((f) => ({ ...f, latitude: la, longitude: lo }));
    reverseGeocode(la, lo);
    fetchNearbyPlaces(la, lo, radius);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      setToast({ type: "error", msg: "Please pick property location on map." });
      return;
    }

    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (coverImage) fd.append("image", coverImage);
    Object.entries(pano).forEach(([k, v]) => {
      if (v) fd.append(`pano_${k}`, v);
    });

    if (showExtraSpaces) {
      extraSpaces.forEach((s, idx) => {
        if (s.image) fd.append("gallery_images", s.image);
      });
    }

    try {
      await api.post("/owner/listings/create/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setToast({ type: "success", msg: "Property posted successfully!" });
      setTimeout(() => nav("/owner/my-properties"), 1500);
    } catch (err) {
      setToast({ type: "error", msg: err?.response?.data?.detail || "Upload failed." });
    } finally {
      setLoading(false);
    }
  };

  const filePreview = (file) => (file ? URL.createObjectURL(file) : null);

  const UploadBlock = ({ label, file, onChange, onRemove, required = false }) => (
    <div className={`relative group flex aspect-video flex-col items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed transition-all duration-300 ${
      file 
        ? "border-blue-500/50 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
        : "border-slate-300/50 bg-slate-500/5 hover:bg-slate-500/10 hover:border-slate-400/50"
    }`}>
      {file ? (
        <>
          <img src={filePreview(file)} alt={label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]">
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-2 rounded-2xl bg-red-500/90 px-5 py-2.5 text-xs font-black text-white transition-all hover:bg-red-600 hover:scale-105 active:scale-95 shadow-lg"
            >
              <Trash2 className="h-4 w-4" />
              Remove File
            </button>
          </div>
          <div className="absolute bottom-4 left-4 rounded-xl bg-white/20 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-wider backdrop-blur-md border border-white/20">
            {label}
          </div>
        </>
      ) : (
        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <ImageIcon className="h-7 w-7" />
          </div>
          <span className={`text-sm font-black ${ui.heading}`}>{label}{required && <span className="text-red-500 ml-1">*</span>}</span>
          <span className="mt-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Click to upload</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => onChange(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 ${ui.pageBg}`}>
      <Shell
        title="Add New Listing"
        subtitle="Market your property to thousands of potential tenants worldwide."
        right={
          <button
            onClick={() => nav(-1)}
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black transition-all hover:scale-105 active:scale-95 ${ui.smallAction}`}
          >
            <X className="h-4 w-4" />
            Discard
          </button>
        }
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <Toast
            type={toast.type}
            message={toast.msg}
            onClose={() => setToast({ type: "info", msg: "" })}
          />

          <form onSubmit={submit} className="grid grid-cols-1 gap-10">
            {/* Basic Info Section */}
            <div className={`rounded-[40px] p-10 lg:p-12 transition-all duration-500 ${ui.card}`}>
              <div className="mb-12 flex items-center gap-6">
                <div className={`flex h-16 w-16 items-center justify-center rounded-[24px] shadow-lg ${ui.glassIcon}`}>
                  <Layout className="h-8 w-8" />
                </div>
                <div>
                  <h2 className={`text-3xl font-black tracking-tight ${ui.heading}`}>Property Identity</h2>
                  <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${ui.muted}`}>Core Information & Pricing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Property Title</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    placeholder="e.g. Royal Penthouse Suite"
                    className={`h-16 w-full rounded-[24px] border px-6 text-sm font-bold outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Category</label>
                  <div className="relative group">
                    <select
                      name="property_type"
                      value={form.property_type}
                      onChange={onChange}
                      className={`h-16 w-full appearance-none rounded-[24px] border px-6 text-sm font-bold outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                    >
                      <option value="room">Single Room</option>
                      <option value="flat">Private Flat</option>
                      <option value="house">Standalone House</option>
                      <option value="apartment">Modern Apartment</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Monthly Rent (NPR)</label>
                  <div className="relative group">
                    <input
                      name="price_per_month"
                      value={form.price_per_month}
                      onChange={onChange}
                      type="number"
                      placeholder="50,000"
                      className={`h-16 w-full rounded-[24px] border pl-14 pr-6 text-sm font-bold outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                      required
                    />
                    <Wallet className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Electricity Policy</label>
                  <input
                    name="electricity_bill"
                    value={form.electricity_bill}
                    onChange={onChange}
                    placeholder="e.g. Inclusive / Meter-based"
                    className={`h-16 w-full rounded-[24px] border px-6 text-sm font-bold outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Contact Hotline</label>
                  <input
                    name="owner_contact_number"
                    value={form.owner_contact_number}
                    onChange={onChange}
                    placeholder="+977-98XXXXXXXX"
                    className={`h-16 w-full rounded-[24px] border px-6 text-sm font-bold outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Inquiry Email</label>
                  <input
                    name="owner_contact_email"
                    value={form.owner_contact_email}
                    onChange={onChange}
                    type="email"
                    placeholder="hello@luxerentals.com"
                    className={`h-16 w-full rounded-[24px] border px-6 text-sm font-bold outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Property Narrative</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    placeholder="Describe the soul of your property..."
                    rows={5}
                    className={`w-full rounded-[32px] border p-8 text-sm font-bold leading-relaxed outline-none ring-blue-500/20 transition-all focus:ring-4 ${ui.input}`}
                  />
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className={`rounded-[40px] p-10 lg:p-12 transition-all duration-500 ${ui.card}`}>
              <div className="mb-12 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-[24px] shadow-lg ${ui.glassIcon}`}>
                    <MapPin className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className={`text-3xl font-black tracking-tight ${ui.heading}`}>Location Hub</h2>
                    <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${ui.muted}`}>Precision Plotting & Intelligence</p>
                  </div>
                </div>
                {picked && (
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(null);
                      setForm(f => ({ ...f, latitude: "", longitude: "" }));
                      setPlace({ display: "" });
                      setNearby({ schools: [], colleges: [], hospitals: [], markets: [], bus: [], atms: [] });
                    }}
                    className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset Pin
                  </button>
                )}
              </div>

              <div className="mb-8 overflow-hidden rounded-[32px] border border-slate-200/50 shadow-inner">
                <LocationPicker picked={picked} onPick={onPick} height={420} />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Latitude</label>
                  <input
                    readOnly
                    value={form.latitude}
                    placeholder="Auto-detected on map"
                    className={`h-16 w-full rounded-[24px] border px-6 text-sm font-bold outline-none opacity-60 cursor-not-allowed ${ui.input}`}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Longitude</label>
                  <input
                    readOnly
                    value={form.longitude}
                    placeholder="Auto-detected on map"
                    className={`h-16 w-full rounded-[24px] border px-6 text-sm font-bold outline-none opacity-60 cursor-not-allowed ${ui.input}`}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Reverse-Geocoded Address</label>
                  <div className={`flex min-h-[64px] w-full items-center rounded-[24px] border px-6 py-4 text-sm font-bold italic leading-relaxed ${ui.input} bg-slate-500/5`}>
                    {geoLoading ? (
                      <div className="flex items-center gap-3 text-blue-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Analyzing coordinates...
                      </div>
                    ) : place.display || "Drop a pin on the map to see the verified address string..."}
                  </div>
                </div>
              </div>

              {picked && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-slate-200/30 pt-10">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-blue-500/20 shadow-lg">
                        <Navigation className="h-5 w-5" />
                      </div>
                      <h3 className={`font-black uppercase tracking-widest text-sm ${ui.heading}`}>Nearby Intelligence</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 rounded-2xl bg-slate-500/5 p-2 pr-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Search Radius</span>
                      <select 
                        value={radius}
                        onChange={(e) => {
                          const r = Number(e.target.value);
                          setRadius(r);
                          if (picked) fetchNearbyPlaces(picked.lat, picked.lng, r);
                        }}
                        className={`h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-black outline-none transition-all focus:border-blue-500 ${ui.input}`}
                      >
                        <option value={500}>0.5 KM (Walking)</option>
                        <option value={1000}>1.0 KM (Standard)</option>
                        <option value={2000}>2.0 KM (Extended)</option>
                        <option value={5000}>5.0 KM (Driving)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { key: "schools", label: "Schools", icon: School, list: nearby.schools, color: "text-orange-500" },
                      { key: "colleges", label: "Colleges", icon: Building2, list: nearby.colleges, color: "text-purple-500" },
                      { key: "hospitals", label: "Hospitals", icon: Bath, list: nearby.hospitals, color: "text-red-500" },
                      { key: "markets", label: "Markets", icon: Layout, list: nearby.markets, color: "text-emerald-500" },
                      { key: "bus", label: "Bus Stops", icon: Bus, list: nearby.bus, color: "text-blue-500" },
                      { key: "atms", label: "Financial", icon: CreditCard, list: nearby.atms, color: "text-amber-500" },
                    ].map((item, idx) => {
                      const isExpanded = expandedCategory === item.key;
                      return (
                        <div key={idx} className="flex flex-col gap-3">
                          <button 
                            type="button"
                            onClick={() => setExpandedCategory(isExpanded ? null : item.key)}
                            className={`flex w-full items-center justify-between rounded-[32px] border p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group ${ui.soft} ${isExpanded ? "ring-2 ring-blue-500/20 border-blue-400" : ""}`}
                          >
                            <div className="flex items-center gap-5">
                              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 transition-transform duration-300 group-hover:scale-110 ${item.color}`}>
                                <item.icon className="h-6 w-6" />
                              </div>
                              <div>
                                <div className={`text-2xl font-black leading-none ${ui.heading}`}>{nearbyLoading ? "..." : item.list.length}</div>
                                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</div>
                              </div>
                            </div>
                            {item.list.length > 0 && (
                              <div className={`rounded-xl p-2 transition-colors ${isExpanded ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500"}`}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            )}
                          </button>

                          {isExpanded && item.list.length > 0 && (
                            <div className={`overflow-hidden rounded-[24px] border border-blue-500/10 p-5 mt-1 animate-in zoom-in-95 duration-300 ${ui.input} bg-blue-50/10`}>
                              <div className="max-h-[300px] overflow-y-auto space-y-4 pr-3 scrollbar-thin scrollbar-thumb-blue-200/50">
                                {item.list.map((facility, fIdx) => (
                                  <div key={fIdx} className="flex items-start justify-between gap-4 border-b border-slate-200/30 pb-4 last:border-0 last:pb-0 group/item">
                                    <div className="flex-1">
                                      <p className={`text-xs font-black leading-snug group-hover/item:text-blue-600 transition-colors ${ui.heading}`}>{facility.name}</p>
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="flex h-5 items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                          <Navigation className="h-2.5 w-2.5" />
                                          {kmOrM(facility.distance_m)} away
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-400 shadow-sm border border-slate-200 group-hover/item:bg-blue-500 group-hover/item:text-white group-hover/item:border-blue-500 transition-all">
                                      {fIdx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Visual Assets Section */}
            <div className={`rounded-[40px] p-10 lg:p-12 transition-all duration-500 ${ui.card}`}>
              <div className="mb-12 flex items-center gap-6">
                <div className={`flex h-16 w-16 items-center justify-center rounded-[24px] shadow-lg ${ui.glassIcon}`}>
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className={`text-3xl font-black tracking-tight ${ui.heading}`}>Visual Portfolio</h2>
                  <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${ui.muted}`}>High-Resolution & 360° Perspectives</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
                <div className="md:col-span-2 lg:col-span-1">
                  <UploadBlock
                    label="Primary Cover"
                    file={coverImage}
                    onChange={setCoverImage}
                    onRemove={() => setCoverImage(null)}
                    required
                  />
                </div>
                {Object.entries(pano).map(([side, file]) => (
                  <UploadBlock
                    key={side}
                    label={`360° ${side}`}
                    file={file}
                    onChange={(f) => onPanoChange(side, f)}
                    onRemove={() => onPanoChange(side, null)}
                  />
                ))}
              </div>

              {showExtraSpaces && (
                <div className="mt-16 border-t border-slate-200/30 pt-12">
                  <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className={`text-2xl font-black tracking-tight ${ui.heading}`}>Architectural Spaces</h3>
                      <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${ui.muted}`}>Detailed gallery for specific areas</p>
                    </div>
                    <button
                      type="button"
                      onClick={addExtraSpace}
                      className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl transition-all hover:bg-black hover:-translate-y-1 active:scale-95"
                    >
                      <Plus className="h-5 w-5" />
                      Add Space Gallery
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {extraSpaces.map((space, idx) => (
                      <div key={idx} className={`relative group rounded-[40px] border p-8 transition-all duration-300 hover:shadow-2xl ${ui.soft}`}>
                        <button
                          type="button"
                          onClick={() => removeExtraSpace(idx)}
                          className="absolute right-6 top-6 rounded-2xl bg-red-500/10 p-3 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="grid grid-cols-1 gap-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Space Category</label>
                              <select
                                value={space.space_type}
                                onChange={(e) => onExtraSpaceChange(idx, "space_type", e.target.value)}
                                className={`h-14 w-full rounded-2xl border px-5 text-sm font-bold outline-none ring-blue-500/10 transition-all focus:ring-4 ${ui.input}`}
                              >
                                <option value="room">General Room</option>
                                <option value="bedroom">Master Bedroom</option>
                                <option value="guest_room">Guest Suite</option>
                                <option value="living_room">Living Lounge</option>
                                <option value="kitchen">Gourmet Kitchen</option>
                                <option value="bathroom">Luxury Bath</option>
                                <option value="balcony">Private Balcony</option>
                                <option value="parking">Secure Parking</option>
                                <option value="outside_view">Exterior View</option>
                              </select>
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Label</label>
                              <input
                                value={space.label}
                                onChange={(e) => onExtraSpaceChange(idx, "label", e.target.value)}
                                placeholder="e.g. Skyline View"
                                className={`h-14 w-full rounded-2xl border px-5 text-sm font-bold outline-none ring-blue-500/10 transition-all focus:ring-4 ${ui.input}`}
                              />
                            </div>
                          </div>
                          <div className="mt-2">
                            <UploadBlock
                              label={`Upload ${space.space_type.replace('_', ' ')} image`}
                              file={space.image}
                              onChange={(f) => onExtraSpaceChange(idx, "image", f)}
                              onRemove={() => onExtraSpaceChange(idx, "image", null)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-end pb-24">
              <button
                type="button"
                onClick={() => nav(-1)}
                className={`order-2 md:order-1 flex items-center justify-center gap-3 rounded-[24px] px-12 py-5 text-sm font-bold transition-all hover:bg-slate-200 active:scale-95 ${ui.smallAction}`}
              >
                Cancel Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="order-1 md:order-2 flex items-center justify-center gap-4 rounded-[24px] bg-blue-600 px-14 py-5 text-base font-black text-white shadow-[0_20px_40px_rgba(37,99,235,0.3)] transition-all hover:-translate-y-1.5 hover:bg-blue-700 hover:shadow-[0_25px_50px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-50 disabled:translate-y-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    Publishing Experience...
                  </>
                ) : (
                  <>
                    Publish Listing
                    <Plus className="h-6 w-6" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Shell>
    </div>
  );
}