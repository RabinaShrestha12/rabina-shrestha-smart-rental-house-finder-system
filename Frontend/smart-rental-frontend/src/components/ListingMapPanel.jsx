// src/components/ListingMapPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "./ThemeContext";
import {
  MapPin,
  Navigation,
  School,
  GraduationCap,
  Hospital,
  ShoppingCart,
  Bus,
  CreditCard,
  ChevronRight,
} from "lucide-react";

// Fix marker icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kmOrM(m) {
  if (m == null) return "";
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

export default function ListingMapPanel({ listing }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const lat = toNum(listing?.latitude);
  const lng = toNum(listing?.longitude);

  const [addrLoading, setAddrLoading] = useState(false);
  const [address, setAddress] = useState(null);

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

  const inFlight = useRef({ nominatim: null, overpass: null });

  const ui = {
    card: isDark
      ? "bg-gradient-to-br from-[#2454b8] via-[#2b63c7] to-[#1f56c5] border border-blue-200/20 shadow-lg shadow-blue-900/20"
      : "bg-white border border-neutral-100 shadow-sm",
    input: isDark
      ? "bg-[#2b63c7] border-blue-100/20 text-white focus:border-blue-200"
      : "bg-white border-neutral-200 text-neutral-900 focus:border-blue-500",
    text: isDark ? "text-white" : "text-neutral-900",
    subText: isDark ? "text-blue-100/80" : "text-neutral-500",
    mutedText: isDark ? "text-blue-100/60" : "text-neutral-400",
    divider: isDark ? "border-blue-100/10" : "border-neutral-100",
  };

  async function reverseGeocode() {
    if (lat == null || lng == null) return;

    if (inFlight.current.nominatim?.abort) inFlight.current.nominatim.abort();
    const ctrl = new AbortController();
    inFlight.current.nominatim = ctrl;

    setAddrLoading(true);
    setAddress(null);
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

      setAddress({
        display: data?.display_name || "",
        road: a.road || a.highway || "",
        suburb: a.suburb || a.neighbourhood || a.quarter || "",
        city: a.city || a.town || a.village || a.municipality || "",
        state: a.state || "",
        country: a.country || "",
        postcode: a.postcode || "",
      });
    } catch {
      setAddress(null);
    } finally {
      setAddrLoading(false);
    }
  }

  async function fetchNearby(radMeters) {
    if (lat == null || lng == null) return;

    if (inFlight.current.overpass?.abort) inFlight.current.overpass.abort();
    const ctrl = new AbortController();
    inFlight.current.overpass = ctrl;

    setNearbyLoading(true);
    setNearby({
      schools: [],
      colleges: [],
      hospitals: [],
      markets: [],
      bus: [],
      atms: [],
    });

    try {
      const r = Number(radMeters);

      const query = `
[out:json][timeout:25];
(
  node(around:${r},${lat},${lng})["amenity"="school"];
  way(around:${r},${lat},${lng})["amenity"="school"];
  relation(around:${r},${lat},${lng})["amenity"="school"];

  node(around:${r},${lat},${lng})["amenity"="college"];
  way(around:${r},${lat},${lng})["amenity"="college"];
  relation(around:${r},${lat},${lng})["amenity"="college"];

  node(around:${r},${lat},${lng})["amenity"="university"];
  way(around:${r},${lat},${lng})["amenity"="university"];
  relation(around:${r},${lat},${lng})["amenity"="university"];

  node(around:${r},${lat},${lng})["amenity"="hospital"];
  way(around:${r},${lat},${lng})["amenity"="hospital"];
  relation(around:${r},${lat},${lng})["amenity"="hospital"];

  node(around:${r},${lat},${lng})["amenity"="clinic"];
  way(around:${r},${lat},${lng})["amenity"="clinic"];
  relation(around:${r},${lat},${lng})["amenity"="clinic"];

  node(around:${r},${lat},${lng})["shop"="supermarket"];
  way(around:${r},${lat},${lng})["shop"="supermarket"];
  relation(around:${r},${lat},${lng})["shop"="supermarket"];

  node(around:${r},${lat},${lng})["amenity"="marketplace"];
  way(around:${r},${lat},${lng})["amenity"="marketplace"];
  relation(around:${r},${lat},${lng})["amenity"="marketplace"];

  node(around:${r},${lat},${lng})["highway"="bus_stop"];
  way(around:${r},${lat},${lng})["highway"="bus_stop"];
  relation(around:${r},${lat},${lng})["highway"="bus_stop"];

  node(around:${r},${lat},${lng})["amenity"="atm"];
  way(around:${r},${lat},${lng})["amenity"="atm"];
  relation(around:${r},${lat},${lng})["amenity"="atm"];
);
out center;
      `.trim();

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "text/plain" },
        body: query,
      });

      const json = await res.json();
      const els = (json?.elements || [])
        .map(normalizeOverpassElement)
        .filter(Boolean)
        .map((x) => ({
          ...x,
          distance_m: haversineMeters(lat, lng, x.lat, x.lng),
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
        schools: schools.slice(0, 8),
        colleges: colleges.slice(0, 8),
        hospitals: hospitals.slice(0, 8),
        markets: markets.slice(0, 8),
        bus: bus.slice(0, 8),
        atms: atms.slice(0, 8),
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

  useEffect(() => {
    if (lat == null || lng == null) return;
    reverseGeocode();
    fetchNearby(radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  useEffect(() => {
    if (lat == null || lng == null) return;
    fetchNearby(radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  const Block = ({ title, items, icon: Icon }) => (
    <div className={`p-4 rounded-2xl border transition-all ${ui.card}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${isDark ? "text-blue-100" : "text-blue-600"}`} />
        <h4 className={`text-xs font-black uppercase tracking-wider ${ui.text}`}>
          {title}
        </h4>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className={`text-xs font-medium italic ${ui.subText}`}>
            No results in this area.
          </p>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className={`p-3 rounded-xl border transition-all hover:translate-x-1 ${
                isDark
                  ? "bg-[#3a74d6] border-blue-100/15"
                  : "bg-neutral-50 border-neutral-100"
              }`}
            >
              <p className={`text-[13px] font-bold truncate ${ui.text}`}>{it.name}</p>
              <div
                className={`mt-1 text-[11px] font-semibold flex items-center gap-1 ${ui.subText}`}
              >
                {it.kind && (
                  <>
                    <span className="capitalize">
                      {it.kind.replace(/_/g, " ")}
                    </span>{" "}
                    •
                  </>
                )}
                {kmOrM(it.distance_m)} away
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (lat == null || lng == null) {
    return (
      <div
        className={`p-8 text-center rounded-3xl border border-dashed ${
          isDark
            ? "border-blue-100/20 bg-gradient-to-br from-[#2454b8] via-[#2b63c7] to-[#1f56c5]"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h3 className={`text-xl font-bold mb-2 ${ui.text}`}>
          Location coordinates not set
        </h3>
        <p className={ui.subText}>
          The owner hasn't provided map coordinates for this property.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className={`text-2xl font-black flex items-center gap-2 ${ui.text}`}>
            <Navigation className="w-6 h-6 text-blue-500" /> Neighborhood Explorer
          </h3>
          <p className={`mt-1 text-sm font-medium ${ui.subText}`}>
            Discover what's around your potential new home.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              isDark
                ? "bg-[#2b63c7] border-blue-100/15"
                : "bg-slate-500/5 border-white/5"
            }`}
          >
            <span className={`text-xs font-black uppercase tracking-wider ${ui.subText}`}>
              Scan:
            </span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${ui.text}`}
            >
              <option value={800}>800 Meters</option>
              <option value={1200}>1.2 Kilometers</option>
              <option value={2000}>2.0 Kilometers</option>
              <option value={3000}>3.0 Kilometers</option>
            </select>
          </div>

          <a
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              isDark
                ? "bg-[#3a74d6] text-white hover:bg-[#4a84e6]"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            Google Maps <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div
        className={`rounded-[30px] overflow-hidden border shadow-2xl relative ${
          isDark
            ? "bg-gradient-to-br from-[#2454b8] via-[#2b63c7] to-[#1f56c5] border-blue-100/15"
            : "border-white/5"
        }`}
      >
        <MapContainer center={[lat, lng]} zoom={16} style={{ height: 400, width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url={
              isDark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
          />

          <Marker position={[lat, lng]}>
            <Popup>
              <div className="min-w-[180px] p-2">
                <div className="font-black text-slate-900">
                  {listing?.title || "Property"}
                </div>
                <div className="mt-2 text-xs text-slate-500 font-medium">
                  {listing?.location || "Address not specified"}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {nearbyLoading && (
          <div className="absolute inset-0 z-[1000] bg-black/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div
              className={`px-4 py-2 rounded-full shadow-lg flex items-center gap-2 ${
                isDark ? "bg-[#2b63c7]/95" : "bg-white/90 dark:bg-[#0f2947]/90"
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-blue-200 animate-bounce" />
              <span
                className={`text-xs font-black uppercase tracking-widest ${
                  isDark ? "text-white" : "text-blue-600 dark:text-blue-400"
                }`}
              >
                Scanning Nearby...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={`p-6 rounded-[32px] border shadow-sm ${ui.card}`}>
        <h4
          className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${ui.text}`}
        >
          <MapPin className="w-4 h-4 text-blue-500" /> Reverse Geocoding{" "}
          {addrLoading && (
            <span className="text-[10px] lowercase text-slate-400 animate-pulse">
              (fetching...)
            </span>
          )}
        </h4>

        {!address && !addrLoading ? (
          <p className={`text-xs font-medium italic ${ui.subText}`}>
            No additional address details found from coordinates.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              ["Sublocality", address?.suburb],
              ["City", address?.city],
              ["State", address?.state],
              ["Road", address?.road],
              ["Postcode", address?.postcode],
              ["Country", address?.country],
            ].map(([k, v]) => (
              <div key={k}>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest mb-1 ${ui.mutedText}`}
                >
                  {k}
                </p>
                <p className={`text-sm font-bold ${v ? ui.text : ui.mutedText}`}>
                  {v || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h4
          className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${ui.text}`}
        >
          <GraduationCap className="w-4 h-4 text-blue-500" /> Local Amenities
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Block title="Schools" items={nearby.schools} icon={School} />
          <Block title="Universities" items={nearby.colleges} icon={GraduationCap} />
          <Block title="Healthcare" items={nearby.hospitals} icon={Hospital} />
          <Block title="Shopping" items={nearby.markets} icon={ShoppingCart} />
          <Block title="Transit" items={nearby.bus} icon={Bus} />
          <Block title="Financial" items={nearby.atms} icon={CreditCard} />
        </div>
      </div>
    </div>
  );
}