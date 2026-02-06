// src/components/ListingMapPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

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
        else if (amenity === "college" || amenity === "university") colleges.push(it);
        else if (amenity === "hospital" || amenity === "clinic") hospitals.push(it);
        else if (shop === "supermarket" || amenity === "marketplace") markets.push(it);
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

  const styles = {
    section: {
      marginTop: 18,
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 16,
      background: "#fff",
    },
    headerRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 10,
    },
    title: { margin: 0, fontSize: 18 },
    sub: { margin: "6px 0 0", fontSize: 13, color: "#6b7280" },

    chipRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    select: {
      padding: "6px 10px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      background: "#fff",
      fontWeight: 700,
    },
    linkBtn: {
      padding: "7px 10px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      background: "#fff",
      textDecoration: "none",
      color: "#111827",
      fontWeight: 800,
    },

    mapWrap: { borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" },

    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 12,
      background: "#fff",
      marginTop: 12,
    },
    cardTitle: { margin: 0, fontSize: 14, fontWeight: 900 },
    metaGrid: {
      marginTop: 10,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      fontSize: 13,
      color: "#111827",
    },
    muted: { color: "#6b7280" },

    nearbyGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
    },
    block: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 },
    blockHead: { fontSize: 13, fontWeight: 900, margin: 0 },
    item: {
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#f9fafb",
    },
    itemName: { fontWeight: 900, fontSize: 13, margin: 0, color: "#111827" },
    itemMeta: { marginTop: 4, fontSize: 12, color: "#6b7280" },

    note: { marginTop: 10, fontSize: 12, color: "#6b7280" },
  };

  const Block = ({ title, items }) => (
    <div style={styles.block}>
      <p style={styles.blockHead}>{title}</p>
      {items.length === 0 ? (
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>No results.</p>
      ) : (
        items.map((it) => (
          <div key={it.id} style={styles.item}>
            <p style={styles.itemName}>{it.name}</p>
            <div style={styles.itemMeta}>
              {it.kind ? `Type: ${it.kind} • ` : ""}Distance: {kmOrM(it.distance_m)}
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (lat == null || lng == null) {
    return (
      <div style={styles.section}>
        <div style={styles.headerRow}>
          <h3 style={styles.title}>📍 Map Location</h3>
        </div>
        <p style={styles.sub}>Owner did not set map coordinates for this listing.</p>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <div style={styles.headerRow}>
        <div>
          <h3 style={styles.title}>📍 Map Location</h3>
          <p style={styles.sub}>
            Click the marker to view quick info. Nearby services loads automatically.
          </p>
        </div>

        <div style={styles.chipRow}>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Radius</span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={styles.select}
          >
            <option value={800}>800 m</option>
            <option value={1200}>1.2 km</option>
            <option value={2000}>2 km</option>
            <option value={3000}>3 km</option>
          </select>

          <a
            style={styles.linkBtn}
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps?q=${lat},${lng}`}
          >
            Open in Google Maps
          </a>
        </div>
      </div>

      <div style={styles.mapWrap}>
        <MapContainer center={[lat, lng]} zoom={16} style={{ height: 360, width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={[lat, lng]}>
            <Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 900 }}>{listing?.title || "Property"}</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {listing?.location || ""}
                </div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
                  {address?.road ? `Road: ${address.road}` : "Road not available"}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Address */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>
          🧭 Address {addrLoading ? <span style={styles.muted}>(loading...)</span> : null}
        </p>

        {!address && !addrLoading ? (
          <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>No address info.</p>
        ) : (
          <div style={styles.metaGrid}>
            <div><b>Full:</b> <span style={styles.muted}>{address?.display || "-"}</span></div>
            <div><b>Road:</b> <span style={styles.muted}>{address?.road || "-"}</span></div>
            <div><b>City:</b> <span style={styles.muted}>{address?.city || "-"}</span></div>
            <div><b>State:</b> <span style={styles.muted}>{address?.state || "-"}</span></div>
            <div><b>Country:</b> <span style={styles.muted}>{address?.country || "-"}</span></div>
            <div><b>Postcode:</b> <span style={styles.muted}>{address?.postcode || "-"}</span></div>
          </div>
        )}
      </div>

      {/* Nearby */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>
          🏫 Nearby Services{" "}
          {nearbyLoading ? <span style={styles.muted}>(loading...)</span> : null}
        </p>

        <div style={styles.nearbyGrid}>
          <Block title="Schools" items={nearby.schools} />
          <Block title="Colleges / Universities" items={nearby.colleges} />
          <Block title="Hospitals / Clinics" items={nearby.hospitals} />
          <Block title="Markets / Supermarkets" items={nearby.markets} />
          <Block title="Bus Stops" items={nearby.bus} />
          <Block title="ATMs" items={nearby.atms} />
        </div>

        <p style={styles.note}>
          Note: Nearby results depend on OpenStreetMap data in your area.
        </p>
      </div>
    </div>
  );
}
