import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) return "/no-image.png";
  const s = String(value).trim();

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // fix "/media/http://127..."
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }

  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

export default function PublicHome() {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [listings, setListings] = useState([]);

  const load = async () => {
    try {
      const res = await api.get("/public/listings/", { params: { q, location, type } });
      setListings(res.data || []);
    } catch (e) {
      console.error(e);
      setListings([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setQ("");
    setLocation("");
    setType("");
    setTimeout(load, 0);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h2>Smart Rental House Finder System</h2>
      <p>Browse properties publicly. Login is required to book or add property.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <button onClick={() => nav("/auth")} style={{ padding: "10px 14px" }}>
          Login / Register
        </button>
        <button onClick={() => nav("/owner/add")} style={{ padding: "10px 14px" }}>
          Add Your Property (Owner)
        </button>
      </div>

      {/* Search box */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 14,
          display: "grid",
          gridTemplateColumns: "1.2fr 1.2fr 0.6fr auto auto",
          gap: 10,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Search</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Location</div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Type</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="">All</option>
            <option value="room">Room</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>
        </div>

        <button onClick={load} style={{ padding: "12px 14px", borderRadius: 8, cursor: "pointer" }}>
          Search
        </button>

        <button onClick={reset} style={{ padding: "12px 14px", borderRadius: 8, cursor: "pointer" }}>
          Reset
        </button>
      </div>

      <h3>Available Listings</h3>

      {listings.length === 0 ? (
        <p>No listings found.</p>
      ) : (
        listings.map((l) => {
          const imgSrc = toImageSrc(l.image_url || l.image);

          return (
            <div
              key={l.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
                display: "flex",
                gap: 16,
              }}
            >
              <img
                src={imgSrc}
                alt={l.title || "listing"}
                style={{
                  width: 190,
                  height: 130,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  background: "#f7f7f7",
                }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/no-image.png";
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{l.title}</div>
                <div><b>Type:</b> {l.property_type}</div>
                <div><b>Location:</b> {l.location}</div>
                <div><b>Price:</b> ${l.price_per_week}/week</div>
                <div style={{ marginTop: 6, color: "#444" }}>
                  {(l.description || "").slice(0, 60) || "This property is ..."}
                </div>

                <div style={{ marginTop: 10 }}>
                  <button onClick={() => nav("/auth")}>Book (Login required)</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
