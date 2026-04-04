// src/pages/tenant/TenantAISearch.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
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
  DollarSign,
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

  const [place, setPlace] = useState("");
  const [radiusKm, setRadiusKm] = useState(2);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);

  const cleanPlace = useMemo(() => place.trim(), [place]);
  const parsedMin = useMemo(() => safeNumber(minPrice), [minPrice]);
  const parsedMax = useMemo(() => safeNumber(maxPrice), [maxPrice]);
  const parsedLat = useMemo(() => safeNumber(lat), [lat]);
  const parsedLng = useMemo(() => safeNumber(lng), [lng]);

  const center = useMemo(() => {
    if (parsedLat != null && parsedLng != null) return [parsedLat, parsedLng];
    if (meta?.center?.lat != null && meta?.center?.lng != null) {
      return [meta.center.lat, meta.center.lng];
    }
    return DEFAULT_CENTER;
  }, [parsedLat, parsedLng, meta]);

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

    if (parsedLat != null && parsedLng != null) {
      return `https://www.google.com/maps/dir/${parsedLat},${parsedLng}/${coords[0]},${coords[1]}`;
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
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
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

    if (!cleanPlace && (parsedLat == null || parsedLng == null)) {
      setErr("Please enter a place or use your current location.");
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
        lat: parsedLat,
        lng: parsedLng,
        radius_km: Number(radiusKm),
        min_price: parsedMin,
        max_price: parsedMax,
        property_type: propertyType,
      };

      // keep this route if your Django urls.py uses the same endpoint
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
    setRadiusKm(2);
    setMinPrice("");
    setMaxPrice("");
    setPropertyType("all");
    setLat("");
    setLng("");
    setErr("");
    setResults([]);
    setMeta(null);
  };

  return (
    <Shell
      title="AI Smart Suggest"
      subtitle="Find rental properties near your college, office, or preferred landmark with smart suggestions and directions."
      right={
        <button
          onClick={() => nav("/tenant")}
          className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl transition-all"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      }
    >
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Search Section */}
        <div className="bg-neutral-900 rounded-[40px] p-8 md:p-12 shadow-2xl shadow-neutral-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-8">
            <div className="space-y-6">
              <div className="relative group">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Search by place, college, office or landmark (e.g. Itahari International College)"
                  className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-[28px] text-white text-lg font-medium placeholder:text-neutral-500 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600/50 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) runAISearch();
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Radius
                  </span>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="bg-transparent text-white font-bold text-sm focus:outline-none"
                  >
                    {[1, 2, 5, 10, 15, 30].map((v) => (
                      <option key={v} value={v} className="text-neutral-900">
                        {v} km
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Type
                  </span>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="bg-transparent text-white font-bold text-sm focus:outline-none"
                  >
                    <option value="all" className="text-neutral-900">
                      All
                    </option>
                    <option value="house" className="text-neutral-900">
                      House
                    </option>
                    <option value="apartment" className="text-neutral-900">
                      Apartment
                    </option>
                    <option value="room" className="text-neutral-900">
                      Room
                    </option>
                  </select>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min Price"
                    className="bg-transparent text-white font-bold text-sm w-full outline-none placeholder:font-medium placeholder:text-neutral-600"
                  />
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max Price"
                    className="bg-transparent text-white font-bold text-sm w-full outline-none placeholder:font-medium placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitude"
                  className="flex-1 min-w-[180px] px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 outline-none"
                />
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Longitude"
                  className="flex-1 min-w-[180px] px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
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
                disabled={loading || (!cleanPlace && !(lat && lng))}
                className="h-full min-h-[72px] bg-blue-600 hover:bg-blue-700 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="py-4 bg-white/10 hover:bg-white/15 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all"
              >
                Clear
              </button>

              <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest text-center px-4">
                AI-based search with map and route direction
              </div>
            </div>
          </div>
        </div>

        {err && (
          <div className="p-6 bg-red-50 border border-red-100 rounded-[32px] flex items-center gap-4 text-red-600">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm font-bold leading-relaxed">{err}</p>
          </div>
        )}

        {meta && (
          <div className="p-5 bg-blue-50 border border-blue-100 rounded-[28px] space-y-1">
            <p className="text-sm font-semibold text-blue-900">
              Search center:{" "}
              {meta.center?.place || `${meta.center?.lat}, ${meta.center?.lng}`}
            </p>
            <p className="text-sm text-blue-800">
              Requested radius: {meta.radiusRequested} km
            </p>
            <p className="text-sm text-blue-800">
              Used radius: {meta.radiusUsed} km
            </p>
            {meta.fallbackUsed && (
              <p className="text-sm font-semibold text-amber-700">
                No listing found in your first radius, so wider results are shown.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
          {/* Map */}
          <div className="w-full bg-white rounded-[32px] overflow-hidden border border-neutral-200 shadow-xl shadow-neutral-900/5 relative min-h-[620px]">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur z-[400] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur px-5 py-2.5 rounded-full shadow-lg border border-neutral-100 text-sm font-bold text-neutral-800">
              {meta?.count ?? results.length} Suggested Properties
            </div>

            <MapContainer
              center={center}
              zoom={13}
              style={{ height: "620px", width: "100%" }}
              minZoom={10}
              maxZoom={18}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBounds
                points={points}
                fallbackCenter={center}
              />

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
                      <div className="flex flex-col gap-2 p-1 min-w-[240px]">
                        <h4 className="font-extrabold text-neutral-900 text-base">
                          {item.title || "Property"}
                        </h4>

                        <div className="text-sm text-neutral-500">
                          {item.location || item.address || "No location available"}
                        </div>

                        <div className="flex justify-between items-center text-sm border-b border-neutral-100 pb-2 mb-2">
                          <span className="text-neutral-500 font-medium">
                            Monthly Rent
                          </span>
                          <span className="font-bold text-blue-600">
                            Rs {item.price_per_month ?? item.price ?? "N/A"}
                          </span>
                        </div>

                        {item.distance_km != null && (
                          <div className="text-xs text-neutral-500 font-medium">
                            {typeof item.distance_km === "number"
                              ? item.distance_km.toFixed(1)
                              : item.distance_km}{" "}
                            km away
                          </div>
                        )}

                        {item.recommendation_score != null && (
                          <div className="text-xs text-indigo-600 font-bold">
                            AI Score: {item.recommendation_score}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button
                            onClick={() => nav(`/public/listings/${item.id}`)}
                            className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition-colors"
                          >
                            View Details
                          </button>

                          <a
                            href={directionsLink(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
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

          {/* Results Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                AI Suggestions
              </h2>
              <span className="px-4 py-1.5 bg-neutral-100 text-neutral-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                {meta?.count ?? results.length} found
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-[24px] border border-neutral-200 p-8 text-center font-semibold text-neutral-500">
                Loading AI suggestions...
              </div>
            ) : results.length === 0 && !err ? (
              <div className="bg-white rounded-[24px] border border-neutral-200 p-8 text-center">
                <Compass className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
                <h3 className="text-lg font-bold text-neutral-800">
                  No properties found
                </h3>
                <p className="text-sm text-neutral-500 mt-2">
                  Try changing the place, increasing the radius, or adjusting the budget.
                </p>
              </div>
            ) : (
              results.map((item, idx) => {
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
                    className="bg-white rounded-[24px] border border-neutral-200 p-5 shadow-sm"
                  >
                    <div className="overflow-hidden rounded-[20px] mb-4 h-48 bg-neutral-100">
                      <img
                        src={imageSrc}
                        alt={item.title || "Property"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-neutral-900">
                          {item.title || "Property"}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                          {item.location || item.address || "No address available"}
                        </p>
                      </div>

                      <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        {distance} km
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3">
                        <div className="text-xs uppercase font-bold tracking-wider text-neutral-500 mb-1">
                          Price
                        </div>
                        <div className="font-bold text-neutral-900">
                          Rs {item.price_per_month ?? item.price ?? "N/A"}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3">
                        <div className="text-xs uppercase font-bold tracking-wider text-neutral-500 mb-1">
                          Type
                        </div>
                        <div className="font-bold text-neutral-900 capitalize">
                          {item.property_type || item.type || "N/A"}
                        </div>
                      </div>
                    </div>

                    {item.recommendation_score != null && (
                      <div className="mb-4 px-3 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold">
                        AI Recommendation Score: {item.recommendation_score}
                      </div>
                    )}

                    {Array.isArray(item.recommend_reasons) &&
                      item.recommend_reasons.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                          <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-2">
                            Why recommended
                          </div>
                          <div className="space-y-1">
                            {item.recommend_reasons.map((reason, i) => (
                              <p key={i} className="text-xs font-medium text-blue-900">
                                • {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => nav(`/public/listings/${item.id}`)}
                        className="px-4 py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-sm transition"
                      >
                        Details
                      </button>

                      <button
                        onClick={() => nav(`/tenant/book/${item.id}`)}
                        className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
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
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                );
              })
            )}

            {!loading && results.length === 0 && !err && (
              <div className="bg-white rounded-[24px] border border-neutral-200 p-8 text-center">
                <Home className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
                <h3 className="text-lg font-bold text-neutral-800">
                  Awaiting Input
                </h3>
                <p className="text-sm text-neutral-500 mt-2">
                  Enter a place or use your current location to get AI-based property suggestions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}