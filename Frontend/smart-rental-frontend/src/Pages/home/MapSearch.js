// src/pages/home/MapSearch.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";

// ✅ Fix default marker icon missing
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ✅ Focus: Morang + Sunsari (Itahari centered)
// These bounds are approximate “district-area” bounds.
// If you want tighter or wider, tell me and I will adjust.
const MORANG_SUNSARI_BOUNDS = L.latLngBounds(
  L.latLng(26.45, 86.85), // SW
  L.latLng(26.90, 87.45)  // NE
);

// ✅ Itahari center (approx)
const ITHARI_CENTER = [26.6636, 87.2747];

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) return;

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));

    // ✅ Always stay inside Morang+Sunsari bounds
    // If markers exist, fit to them, but never outside the bounds.
    if (bounds.isValid()) {
      // If bounds exceed our district bounds, just fit to district bounds
      const outOfArea =
        !MORANG_SUNSARI_BOUNDS.contains(bounds.getSouthWest()) ||
        !MORANG_SUNSARI_BOUNDS.contains(bounds.getNorthEast());

      map.fitBounds(outOfArea ? MORANG_SUNSARI_BOUNDS : bounds, { padding: [40, 40] });
    }
  }, [points, map]);

  return null;
}

export default function MapSearch() {
  const nav = useNavigate();

  const [geo, setGeo] = useState({ lat: null, lng: null });
  const [geoError, setGeoError] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);

  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);

  // ✅ Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported on this browser.");
      setGeo({ lat: ITHARI_CENTER[0], lng: ITHARI_CENTER[1] });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // ✅ If user is outside Morang/Sunsari, still show Itahari (focus area)
        if (!MORANG_SUNSARI_BOUNDS.contains(L.latLng(lat, lng))) {
          setGeoError("You are outside Morang/Sunsari area. Showing Itahari map only.");
          setGeo({ lat: ITHARI_CENTER[0], lng: ITHARI_CENTER[1] });
          return;
        }

        setGeo({ lat, lng });
      },
      (err) => {
        console.error(err);
        setGeoError("Location permission denied. Showing Itahari map only.");
        setGeo({ lat: ITHARI_CENTER[0], lng: ITHARI_CENTER[1] });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // ✅ Fetch nearby listings
  useEffect(() => {
    if (geo.lat == null || geo.lng == null) return;

    (async () => {
      setLoading(true);
      try {
        const res = await api.get("public/listings/nearby/", {
          params: { lat: geo.lat, lng: geo.lng, radius_km: radiusKm },
        });
        setListings(res.data || []);
      } catch (e) {
        console.error(e);
        setGeoError("Failed to load nearby listings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [geo.lat, geo.lng, radiusKm]);

  const points = useMemo(() => {
    return (listings || [])
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({ id: l.id, lat: Number(l.latitude), lng: Number(l.longitude) }));
  }, [listings]);

  const center = useMemo(() => {
    if (geo.lat == null || geo.lng == null) return ITHARI_CENTER;
    return [geo.lat, geo.lng];
  }, [geo.lat, geo.lng]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🗺️ Map Search (Morang + Sunsari / Itahari Focus)</h2>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontWeight: 700 }}>
            Radius:
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ marginLeft: 8, padding: 6, borderRadius: 8 }}
            >
              <option value={1}>1 km</option>
              <option value={3}>3 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => nav(-1)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back
          </button>
        </div>
      </div>

      {geoError ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#fff3cd" }}>
          {geoError}
        </div>
      ) : null}

      <div style={{ marginTop: 10, opacity: 0.85 }}>
        {loading ? "Loading nearby listings..." : `Found ${listings.length} listing(s)`}
      </div>

      <div
        style={{
          marginTop: 12,
          height: "70vh",
          width: "100%",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e5e5e5",
        }}
      >
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          // ✅ lock to Morang+Sunsari bounds
          maxBounds={MORANG_SUNSARI_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={11}
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* ✅ radius circle */}
          {geo.lat != null && geo.lng != null && (
            <Circle center={[geo.lat, geo.lng]} radius={radiusKm * 1000} />
          )}

          {/* ✅ auto fit markers */}
          {points.length > 0 && <FitBounds points={points} />}

          {/* ✅ markers only inside Morang+Sunsari bounds */}
          {(listings || []).map((l) => {
            if (l.latitude == null || l.longitude == null) return null;

            const lat = Number(l.latitude);
            const lng = Number(l.longitude);

            if (!MORANG_SUNSARI_BOUNDS.contains(L.latLng(lat, lng))) return null;

            return (
              <Marker key={l.id} position={[lat, lng]}>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>{l.title}</div>
                    <div style={{ marginBottom: 6 }}>
                      <b>Price:</b> ${l.price_per_month} / month
                    </div>
                    {l.distance_km != null && (
                      <div style={{ marginBottom: 6 }}>
                        <b>Distance:</b> {l.distance_km} km
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => nav(`/public/listings/${l.id}`)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
