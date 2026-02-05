import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) return "/no-image.png";
  const s = String(value).trim();

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }

  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

function weekToMonth(weekly) {
  const n = Number(weekly);
  if (Number.isNaN(n) || n <= 0) return null;
  return n * 4.345;
}

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function PublicListings() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [qTitle, setQTitle] = useState("");
  const [qLocation, setQLocation] = useState("");
  const [qType, setQType] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/public/listings/");
        setListings(res.data || []);
      } catch (e) {
        console.error(e);
        alert("Failed to load listings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = qTitle.trim().toLowerCase();
    const loc = qLocation.trim().toLowerCase();

    return (listings || []).filter((l) => {
      const titleOk = !t || (l.title || "").toLowerCase().includes(t);
      const locOk = !loc || (l.location || "").toLowerCase().includes(loc);
      const typeOk = qType === "all" || (l.property_type || "") === qType;
      return titleOk && locOk && typeOk;
    });
  }, [listings, qTitle, qLocation, qType]);

  const reset = () => {
    setQTitle("");
    setQLocation("");
    setQType("all");
  };

  const go360 = (listingId) => navigate(`/listing/${listingId}/360`);
  const goDetails = (listingId) => navigate(`/listings/${listingId}`);

  // ✅ Booking with auth check + redirect save
  const goBook = (listingId, booked) => {
    if (booked) return;

    const token = localStorage.getItem("access");
    const role = localStorage.getItem("role");

    if (!token) {
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listingId}`);
      navigate("/auth");
      return;
    }

    if (role !== "tenant") {
      alert("Please login as Tenant to book a property.");
      sessionStorage.setItem("post_login_redirect", `/tenant/book/${listingId}`);
      navigate("/auth");
      return;
    }

    navigate(`/tenant/book/${listingId}`);
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Smart Rental House Finder System</h2>

      {/* SEARCH BAR */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <input
          value={qTitle}
          onChange={(e) => setQTitle(e.target.value)}
          placeholder="Search title"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ccc",
            minWidth: 200,
          }}
        />

        <input
          value={qLocation}
          onChange={(e) => setQLocation(e.target.value)}
          placeholder="Location"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ccc",
            minWidth: 200,
          }}
        />

        <select
          value={qType}
          onChange={(e) => setQType(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ccc",
            minWidth: 140,
          }}
        >
          <option value="all">All</option>
          <option value="room">Room</option>
          <option value="house">House</option>
          <option value="apartment">Apartment</option>
        </select>

        <button
          onClick={() => {}}
          style={{ padding: "10px 14px", borderRadius: 10 }}
          title="Filtering happens automatically as you type"
        >
          Search
        </button>

        <button onClick={reset} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Reset
        </button>
      </div>

      <h3 style={{ marginTop: 0 }}>
        Available Listings{" "}
        <span style={{ fontSize: 12, opacity: 0.7 }}>({filtered.length} found)</span>
      </h3>

      {filtered.length === 0 && <div>No listings found.</div>}

      {/* LISTINGS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((l) => {
          const cover = toImageSrc(l.image_url || l.image || l.pano_front_url);
          const booked = l.is_available === false || l.status === "booked";

          const monthPriceRaw =
            l.price_per_month ?? (l.price_per_week ? weekToMonth(l.price_per_week) : null);

          const monthPriceText = monthPriceRaw == null ? "-" : money(monthPriceRaw);

          return (
            <div
              key={l.id}
              style={{
                display: "flex",
                gap: 16,
                padding: 14,
                border: "1px solid #ddd",
                borderRadius: 12,
                alignItems: "center",
                background: "#fff",
              }}
            >
              {/* IMAGE + VIEW 360 overlay */}
              <div style={{ position: "relative" }}>
                <img
                  src={cover}
                  alt=""
                  style={{
                    width: 180,
                    height: 130,
                    objectFit: "cover",
                    borderRadius: 12,
                    display: "block",
                    border: "1px solid #ccc",
                  }}
                  onError={(e) => (e.currentTarget.src = "/no-image.png")}
                />

                <button
                  onClick={() => go360(l.id)}
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "0",
                    background: "rgba(0,0,0,0.65)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  View 360°
                </button>
              </div>

              {/* DETAILS */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{l.title || "About Property"}</div>

                <div style={{ marginTop: 6 }}>
                  <b>Type:</b> {l.property_type || "-"}
                </div>
                <div>
                  <b>Location:</b> {l.location || "-"}
                </div>

                <div>
                  <b>Price:</b> ${monthPriceText}/month
                </div>

                {l.description && <div style={{ marginTop: 6, opacity: 0.85 }}>{l.description}</div>}

                {booked && (
                  <div
                    style={{
                      marginTop: 10,
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "#fff3cd",
                      fontWeight: 800,
                    }}
                  >
                    Booked
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => goDetails(l.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Details
                </button>

                <button
                  onClick={() => goBook(l.id, booked)}
                  disabled={booked}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: booked ? "not-allowed" : "pointer",
                    fontWeight: 800,
                  }}
                >
                  {booked ? "Booked" : "Booking"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
