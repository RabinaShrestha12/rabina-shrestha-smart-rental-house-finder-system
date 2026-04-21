import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  Sparkles,
  MapPin,
  ChevronRight,
  ExternalLink,
  Calendar,
  RefreshCw,
  AlertCircle,
  Banknote,
  LocateFixed,
  Navigation,
  Compass,
  Home,
} from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BACKEND = "http://127.0.0.1:8000";
const DEFAULT_CENTER = [26.6636, 87.2747]; // Itahari
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560520653-9e0e4c89eb81?auto=format&fit=crop&q=80&w=800";

function safeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function normalizeResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function extractLatLng(item) {
  const lat = safeNumber(item?.latitude ?? item?.lat);
  const lng = safeNumber(item?.longitude ?? item?.lng ?? item?.lon);
  if (lat == null || lng == null) return null;
  return [lat, lng];
}

function toImageSrc(value) {
  if (!value) return FALLBACK_IMAGE;

  const s = String(value).trim();
  if (!s) return FALLBACK_IMAGE;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }

  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s.replace(/^\/+/, "")}`;
}

function FitBounds({ points, fallbackCenter }) {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) {
      map.setView(fallbackCenter, 12);
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, fallbackCenter, map]);

  return null;
}

export default function TenantAISearch() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [place, setPlace] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [propertyType, setPropertyType] = useState("all");

  const [geo, setGeo] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [searched, setSearched] = useState(false);

  const cleanPlace = useMemo(() => place.trim(), [place]);
  const parsedMin = useMemo(() => safeNumber(minPrice), [minPrice]);
  const parsedMax = useMemo(() => safeNumber(maxPrice), [maxPrice]);

  const center = useMemo(() => {
    if (geo.lat != null && geo.lng != null) return [geo.lat, geo.lng];
    if (meta?.center?.lat != null && meta?.center?.lng != null) {
      return [meta.center.lat, meta.center.lng];
    }
    return DEFAULT_CENTER;
  }, [geo, meta]);

  const points = useMemo(() => {
    return results
      .map((item) => {
        const coords = extractLatLng(item);
        if (!coords) return null;
        return {
          id: item.id,
          lat: coords[0],
          lng: coords[1],
        };
      })
      .filter(Boolean);
  }, [results]);

  const mapsLink = (item) => {
    const coords = extractLatLng(item);

    if (coords) {
      return `https://www.google.com/maps?q=${coords[0]},${coords[1]}`;
    }

    const q = encodeURIComponent(item?.title || item?.location || "property");
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  };

  const directionsLink = (item) => {
    const coords = extractLatLng(item);

    if (!coords) {
      return mapsLink(item);
    }

    if (geo.lat != null && geo.lng != null) {
      return `https://www.google.com/maps/dir/${geo.lat},${geo.lng}/${coords[0]},${coords[1]}`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`;
  };

  const handleUseMyLocation = () => {
    setErr("");

    if (!navigator.geolocation) {
      setErr("Geolocation is not supported by your browser.");
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setDetecting(false);
      },
      () => {
        setErr("Unable to fetch your current location.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const runAISearch = async () => {
    setErr("");
    setSearched(true);

    if (!cleanPlace && (geo.lat == null || geo.lng == null)) {
      setErr("Please enter a location or use your current location.");
      return;
    }

    if (parsedMin != null && parsedMin < 0) {
      setErr("Minimum price cannot be negative.");
      return;
    }

    if (parsedMax != null && parsedMax < 0) {
      setErr("Maximum price cannot be negative.");
      return;
    }

    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setErr("Minimum price cannot be greater than maximum price.");
      return;
    }

    setLoading(true);
    setResults([]);
    setMeta(null);

    try {
      const payload = {
        place: cleanPlace,
        lat: geo.lat,
        lng: geo.lng,
        radius_km: Number(radiusKm),
        min_price: parsedMin,
        max_price: parsedMax,
        property_type: propertyType,
      };

      const res = await api.post("/tenant/ai/suggest/", payload);
      const normalized = normalizeResults(res.data);

      setResults(normalized);
      setMeta({
        center: res.data?.center || null,
        radiusRequested: res.data?.radius_km_requested ?? null,
        radiusUsed: res.data?.radius_km_used ?? null,
        fallbackUsed: res.data?.fallback_used ?? false,
        count: res.data?.count ?? normalized.length,
      });
    } catch (e) {
      console.error("AI search error:", e?.response?.data || e.message);

      const backendError =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.response?.data?.error;

      setErr(
        backendError ||
          "AI search failed. Please check the backend endpoint and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setPlace("");
    setRadiusKm(5);
    setMinPrice("");
    setMaxPrice("");
    setPropertyType("all");
    setErr("");
    setResults([]);
    setMeta(null);
    setSearched(false);
  };

  return (
    <Shell
      title="AI Smart Suggest"
      subtitle="Find rental properties near your college, office, or preferred landmark with smart suggestions and directions."
      right={
        <button
          onClick={() => nav("/tenant")}
          className={`p-3 rounded-2xl transition-all ${
            isDark
              ? "bg-[#17395f] hover:bg-[#1f4b7a] text-blue-100 border border-blue-400/15"
              : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200"
          }`}
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      }
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* FIXED BLUE AI SEARCH BOX */}
        <div
          className="rounded-[36px] p-6 md:p-8 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #2454b8 0%, #2f6fe4 55%, #1f56c5 100%)",
            border: "1px solid rgba(147, 197, 253, 0.35)",
            boxShadow: "0 20px 40px rgba(37, 99, 235, 0.28)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"
            style={{ background: "rgba(103, 232, 249, 0.22)" }}
          />

          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1fr_210px] gap-6">
            <div className="space-y-5">
              <div className="relative group">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-100/80 group-focus-within:text-white transition-colors" />
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Search by place, college, office or landmark (e.g. Itahari International College)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) runAISearch();
                  }}
                  className="w-full pl-14 pr-5 py-5 rounded-[24px] text-base font-medium focus:outline-none focus:ring-4 text-white placeholder:text-blue-50/75"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div
                  className="rounded-2xl px-4 py-4"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-blue-50/85">
                    Radius
                  </label>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full bg-transparent font-bold text-sm focus:outline-none text-white"
                  >
                    {[1, 2, 5, 10, 15, 30].map((v) => (
                      <option key={v} value={v} className="text-neutral-900">
                        {v} km
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="rounded-2xl px-4 py-4"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-blue-50/85">
                    Type
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full bg-transparent font-bold text-sm focus:outline-none text-white"
                  >
                    <option value="all" className="text-neutral-900">
                      All
                    </option>
                    <option value="room" className="text-neutral-900">
                      Room
                    </option>
                    <option value="apartment" className="text-neutral-900">
                      Apartment
                    </option>
                    <option value="house" className="text-neutral-900">
                      House
                    </option>
                  </select>
                </div>

                <div
                  className="rounded-2xl px-4 py-4 flex items-center gap-2"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <Banknote className="w-4 h-4 text-blue-50/85" />
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min Price"
                    className="bg-transparent font-bold text-sm w-full outline-none text-white placeholder:text-blue-50/70"
                  />
                </div>

                <div
                  className="rounded-2xl px-4 py-4 flex items-center gap-2"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <Banknote className="w-4 h-4 text-blue-50/85" />
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max Price"
                    className="bg-transparent font-bold text-sm w-full outline-none text-white placeholder:text-blue-50/70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                <input
                  type="number"
                  step="any"
                  value={geo.lat ?? ""}
                  onChange={(e) =>
                    setGeo((prev) => ({
                      ...prev,
                      lat: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="Latitude"
                  className="px-4 py-4 rounded-2xl font-medium outline-none text-white placeholder:text-blue-100"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                />

                <input
                  type="number"
                  step="any"
                  value={geo.lng ?? ""}
                  onChange={(e) =>
                    setGeo((prev) => ({
                      ...prev,
                      lng: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="Longitude"
                  className="px-4 py-4 rounded-2xl font-medium outline-none text-white placeholder:text-blue-100"
                  style={{
                    background: "#3b82f6",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                />

                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="px-4 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white"
                  style={{
                    background: "#1d4ed8",
                    border: "1px solid rgba(255,255,255,0.30)",
                  }}
                >
                  {detecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <LocateFixed className="w-4 h-4" />
                  )}
                  Use My Location
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={runAISearch}
                disabled={loading || (!cleanPlace && !(geo.lat && geo.lng))}
                className="h-full min-h-[110px] rounded-[24px] font-black text-sm uppercase tracking-[0.18em] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{
                  background: "#1e40af",
                  border: "1px solid rgba(255,255,255,0.20)",
                }}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Suggest
                  </>
                )}
              </button>

              <button
                onClick={clearFilters}
                type="button"
                className="py-4 rounded-[20px] font-black text-xs uppercase tracking-widest text-white"
                style={{
                  background: "#2563eb",
                  border: "1px solid rgba(255,255,255,0.30)",
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div
            className={`p-5 rounded-[24px] flex items-center gap-4 border ${
              isDark
                ? "bg-red-500/10 border-red-400/20 text-red-200"
                : "bg-red-50 border-red-100 text-red-600"
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-bold">{err}</p>
          </div>
        )}

        {meta && (
          <div
            className={`p-4 rounded-[24px] space-y-1 border ${
              isDark
                ? "bg-sky-500/10 border-sky-400/20"
                : "bg-blue-50 border-blue-100"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                isDark ? "text-sky-100" : "text-blue-900"
              }`}
            >
              Search center:{" "}
              {meta.center?.place || `${meta.center?.lat}, ${meta.center?.lng}`}
            </p>
            <p
              className={`text-sm ${
                isDark ? "text-sky-200/85" : "text-blue-800"
              }`}
            >
              Radius used: {meta.radiusUsed} km
            </p>
            {meta.fallbackUsed && (
              <p
                className={`text-sm font-semibold ${
                  isDark ? "text-amber-300" : "text-amber-700"
                }`}
              >
                No listing found in your first radius, so wider results are shown.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr] gap-6">
          <div
            className={`rounded-[28px] overflow-hidden border shadow-sm relative min-h-[580px] ${
              isDark
                ? "bg-[#0f2744] border-blue-400/10"
                : "bg-white border-neutral-200"
            }`}
          >
            {loading && (
              <div
                className={`absolute inset-0 backdrop-blur z-[400] flex items-center justify-center ${
                  isDark ? "bg-[#0f2744]/80" : "bg-white/80"
                }`}
              >
                <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              </div>
            )}

            <div
              className={`absolute top-4 left-4 z-[400] px-4 py-2 rounded-full shadow border text-sm font-bold ${
                isDark
                  ? "bg-[#17395f]/95 text-blue-50 border-blue-400/15"
                  : "bg-white/95 text-neutral-800 border-neutral-100"
              }`}
            >
              {meta?.count ?? results.length} Listings
            </div>

            <MapContainer
              center={center}
              zoom={13}
              style={{ height: "580px", width: "100%" }}
              minZoom={10}
              maxZoom={18}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBounds points={points} fallbackCenter={center} />

              {center?.[0] != null && center?.[1] != null && (
                <Circle
                  center={center}
                  radius={Number(radiusKm) * 1000}
                  pathOptions={{
                    color: "#2563eb",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.12,
                  }}
                />
              )}

              {results.map((item) => {
                const coords = extractLatLng(item);
                if (!coords) return null;

                return (
                  <Marker key={item.id} position={coords}>
                    <Popup>
                      <div className="min-w-[220px] space-y-2">
                        <h4 className="font-extrabold text-neutral-900">
                          {item.title || "Property"}
                        </h4>
                        <p className="text-sm text-neutral-500">
                          {item.location || "No location available"}
                        </p>
                        <p className="text-sm font-bold text-blue-600">
                          Rs {item.price_per_month ?? "N/A"}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => nav(`/public/listings/${item.id}`)}
                            className="py-2 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl text-xs"
                          >
                            Details
                          </button>

                          <a
                            href={directionsLink(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Route
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2
                className={`text-2xl font-black ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                AI Suggestions
              </h2>
              <span
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isDark
                    ? "bg-[#17395f] text-blue-100 border border-blue-400/15"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {meta?.count ?? results.length} found
              </span>
            </div>

            {!loading && !searched && (
              <div
                className={`rounded-[24px] border p-8 text-center ${
                  isDark
                    ? "bg-[#102d50] border-blue-400/10"
                    : "bg-white border-neutral-200"
                }`}
              >
                <Home
                  className={`w-10 h-10 mx-auto mb-3 ${
                    isDark ? "text-blue-200/30" : "text-neutral-300"
                  }`}
                />
                <h3
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-neutral-800"
                  }`}
                >
                  Search Listings
                </h3>
                <p
                  className={`text-sm mt-2 ${
                    isDark ? "text-blue-200/65" : "text-neutral-500"
                  }`}
                >
                  Enter location, radius, min price, max price, and property type.
                </p>
              </div>
            )}

            {searched && !loading && results.length === 0 && !err && (
              <div
                className={`rounded-[24px] border p-8 text-center ${
                  isDark
                    ? "bg-[#102d50] border-blue-400/10"
                    : "bg-white border-neutral-200"
                }`}
              >
                <Compass
                  className={`w-10 h-10 mx-auto mb-3 ${
                    isDark ? "text-blue-200/30" : "text-neutral-300"
                  }`}
                />
                <h3
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-neutral-800"
                  }`}
                >
                  No listings found
                </h3>
                <p
                  className={`text-sm mt-2 ${
                    isDark ? "text-blue-200/65" : "text-neutral-500"
                  }`}
                >
                  Try changing the filters or increasing the radius.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {results.map((item, idx) => {
                const imageSrc = toImageSrc(
                  item.image || item.image_url || item.cover_image || item.photo
                );

                const distance =
                  typeof item.distance_km === "number"
                    ? item.distance_km.toFixed(1)
                    : item.distance_km || "Nearby";

                return (
                  <div
                    key={item.id || idx}
                    className={`rounded-[24px] border p-4 shadow-sm hover:shadow-md transition-all ${
                      isDark
                        ? "bg-[#102d50] border-blue-400/10"
                        : "bg-white border-neutral-200"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`w-28 h-28 rounded-[18px] overflow-hidden shrink-0 ${
                          isDark ? "bg-[#17395f]" : "bg-neutral-100"
                        }`}
                      >
                        <img
                          src={imageSrc}
                          alt={item.title || "Property"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3
                              className={`text-lg font-extrabold leading-tight ${
                                isDark ? "text-white" : "text-neutral-900"
                              }`}
                            >
                              {item.title || "Property"}
                            </h3>
                            <p
                              className={`text-sm mt-1 flex items-center gap-1 ${
                                isDark ? "text-blue-200/70" : "text-neutral-500"
                              }`}
                            >
                              <MapPin className="w-4 h-4" />
                              {item.location || "No location available"}
                            </p>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                              isDark
                                ? "bg-sky-500/15 text-sky-300 border border-sky-400/20"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {distance} km
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div
                            className={`rounded-2xl border p-3 ${
                              isDark
                                ? "bg-[#17395f] border-blue-400/10"
                                : "bg-neutral-50 border-neutral-200"
                            }`}
                          >
                            <div
                              className={`text-[10px] uppercase font-black tracking-widest mb-1 ${
                                isDark ? "text-blue-200/50" : "text-neutral-500"
                              }`}
                            >
                              Price
                            </div>
                            <div
                              className={`font-bold ${
                                isDark ? "text-white" : "text-neutral-900"
                              }`}
                            >
                              Rs {item.price_per_month ?? "N/A"}
                            </div>
                          </div>

                          <div
                            className={`rounded-2xl border p-3 ${
                              isDark
                                ? "bg-[#17395f] border-blue-400/10"
                                : "bg-neutral-50 border-neutral-200"
                            }`}
                          >
                            <div
                              className={`text-[10px] uppercase font-black tracking-widest mb-1 ${
                                isDark ? "text-blue-200/50" : "text-neutral-500"
                              }`}
                            >
                              Type
                            </div>
                            <div
                              className={`font-bold capitalize ${
                                isDark ? "text-white" : "text-neutral-900"
                              }`}
                            >
                              {item.property_type || "N/A"}
                            </div>
                          </div>
                        </div>

                        {Array.isArray(item.recommend_reasons) &&
                          item.recommend_reasons.length > 0 && (
                            <div
                              className={`mt-3 rounded-2xl border p-3 ${
                                isDark
                                  ? "bg-sky-500/10 border-sky-400/20"
                                  : "bg-blue-50 border-blue-100"
                              }`}
                            >
                              <div
                                className={`text-[10px] uppercase font-black tracking-widest mb-1 ${
                                  isDark ? "text-sky-300" : "text-blue-700"
                                }`}
                              >
                                Why recommended
                              </div>
                              <div className="space-y-1">
                                {item.recommend_reasons.slice(0, 2).map((reason, i) => (
                                  <p
                                    key={i}
                                    className={`text-xs font-medium ${
                                      isDark ? "text-sky-100" : "text-blue-900"
                                    }`}
                                  >
                                    • {reason}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <button
                            onClick={() => nav(`/public/listings/${item.id}`)}
                            className={`px-4 py-3 rounded-2xl font-bold text-sm transition ${
                              isDark
                                ? "bg-[#17395f] hover:bg-[#225285] text-white border border-blue-400/10"
                                : "bg-neutral-900 hover:bg-black text-white"
                            }`}
                          >
                            Details
                          </button>

                          <button
                            onClick={() => nav(`/tenant/book/${item.id}`)}
                            className={`px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                              isDark
                                ? "bg-sky-400 hover:bg-sky-300 text-slate-950"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            Request
                          </button>

                          <a
                            href={directionsLink(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                          >
                            <Navigation className="w-4 h-4" />
                            Route
                          </a>
                        </div>

                        <div className="mt-3">
                          <a
                            href={mapsLink(item)}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${
                              isDark
                                ? "text-sky-300 hover:text-sky-200"
                                : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open in Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}