import React, { useEffect, useState } from "react";
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

export default function HomePublic() {
  const nav = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");

  const token = localStorage.getItem("access");
  const role = localStorage.getItem("role");

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/public/listings/", { params: { q, location, type } });
      setListings(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load listings");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setQ("");
    setLocation("");
    setType("");
    setTimeout(loadListings, 0);
  };

  const handleAddProperty = () => {
    const t = localStorage.getItem("access");
    const r = localStorage.getItem("role");

    if (!t) {
      alert("Please login / register first to add a property.");
      return nav("/auth");
    }
    if (r !== "owner") {
      alert("Only Owner account can add a property. Please login as Owner.");
      return nav("/unauthorized");
    }
    nav("/owner/listings/create");
  };

  // ---------------- STYLES ----------------
  const page = {
    minHeight: "100vh",
    padding: "26px 14px",
    position: "relative",
    overflow: "hidden",
    // ✅ much more color (less white)
    background:
      "radial-gradient(900px 500px at 10% 10%, rgba(34,211,238,0.45) 0%, rgba(34,211,238,0) 60%)," +
      "radial-gradient(900px 520px at 85% 15%, rgba(168,85,247,0.42) 0%, rgba(168,85,247,0) 60%)," +
      "radial-gradient(900px 520px at 25% 85%, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0) 60%)," +
      "radial-gradient(900px 520px at 85% 85%, rgba(251,113,133,0.25) 0%, rgba(251,113,133,0) 60%)," +
      "linear-gradient(180deg, #0b1020 0%, #0b1630 35%, #0e1b3a 100%)",
  };

  const shell = { maxWidth: 1250, margin: "0 auto" };

  const topBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 14,
  };

  const h1 = { margin: 0, fontSize: 22, fontWeight: 900, color: "#e5e7eb" };
  const sub = { margin: 0, color: "rgba(229,231,235,0.75)", fontSize: 13 };

  const btnBase = {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 900,
    backdropFilter: "blur(10px)",
  };

  const btnPrimary = {
    ...btnBase,
    background: "linear-gradient(135deg, rgba(59,130,246,0.95) 0%, rgba(168,85,247,0.95) 100%)",
    border: "1px solid rgba(255,255,255,0.18)",
  };

  const panel = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
  };

  const label = { fontWeight: 900, marginBottom: 6, color: "#e5e7eb" };

  const input = {
    width: "100%",
    padding: 11,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    outline: "none",
    background: "rgba(15,23,42,0.55)",
    color: "#e5e7eb",
  };

  const smallHint = { color: "rgba(229,231,235,0.70)", fontSize: 12, marginTop: 6 };

  const tag = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(59,130,246,0.18)",
    color: "#bfdbfe",
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.14)",
  };

  const tagBooked = {
    ...tag,
    background: "rgba(245,158,11,0.18)",
    color: "#fde68a",
  };

  const card = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 16px 55px rgba(0,0,0,0.35)",
    transition: "transform .18s ease, box-shadow .18s ease",
  };

  const img = {
    width: "100%",
    height: 170,
    objectFit: "cover",
    display: "block",
    background: "rgba(255,255,255,0.06)",
  };

  const overlay360 = {
    position: "absolute",
    right: 12,
    bottom: 12,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    backdropFilter: "blur(6px)",
  };

  const actionBtn = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 900,
  };

  const bookingBtn = (disabled) => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: disabled
      ? "rgba(148,163,184,0.25)"
      : "linear-gradient(135deg, rgba(34,197,94,0.95) 0%, rgba(16,185,129,0.95) 100%)",
    color: disabled ? "rgba(229,231,235,0.85)" : "#06121f",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
  });

  // ✅ Responsive + 4 columns on desktop
  const responsiveCss = `
    .searchGrid { display:grid; grid-template-columns: 1.2fr 1.2fr .7fr auto auto; gap: 10px; align-items: end; }
    .listingGrid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }

    @media (max-width: 1200px) {
      .listingGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 900px) {
      .listingGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .searchGrid { grid-template-columns: 1fr; }
    }
    @media (max-width: 520px) {
      .listingGrid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div style={page}>
      <style>{responsiveCss}</style>

      <div style={shell}>
        {/* Header */}
        <div style={topBar}>
          <div>
            <h2 style={h1}>Smart Rental House Finder System</h2>
            <p style={sub}>Browse properties publicly. Login is required to request booking.</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => nav("/auth")} style={btnBase}>
              Login / Register
            </button>
            <button onClick={handleAddProperty} style={btnPrimary}>
              Add Property (Owner)
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={panel}>
          <div className="searchGrid">
            <div>
              <div style={label}>Search</div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title" style={input} />
              <div style={smallHint}>Example: “room”, “house”, “near college”</div>
            </div>

            <div>
              <div style={label}>Location</div>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={input} />
              <div style={smallHint}>Example: “Ithari”, “Canberra”</div>
            </div>

            <div>
              <div style={label}>Type</div>
              <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
                <option value="">All</option>
                <option value="room">Room</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
              </select>
              <div style={smallHint}>Choose one type</div>
            </div>

            <button onClick={loadListings} style={btnPrimary}>
              Search
            </button>

            <button onClick={reset} style={btnBase}>
              Reset
            </button>
          </div>
        </div>

        {/* Listings */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: "10px 0", color: "#e5e7eb" }}>Available Listings</h3>
            {!loading && <span style={tag}>{listings.length} found</span>}
          </div>

          {loading && <p style={{ color: "#e5e7eb" }}>Loading...</p>}
          {!loading && listings.length === 0 && <p style={{ color: "#e5e7eb" }}>No listings found.</p>}

          <div className="listingGrid">
            {!loading &&
              listings.map((item) => {
                const has360 =
                  item.pano_front_url &&
                  item.pano_back_url &&
                  item.pano_left_url &&
                  item.pano_right_url &&
                  item.pano_up_url &&
                  item.pano_down_url;

                const thumb = toImageSrc(item.pano_front_url || item.image_url || item.image);

                const booked = item.status === "booked" || item.is_available === false;

                let btnLabel = "Request Booking";
                if (!token) btnLabel = "Login to Book";
                else if (role !== "tenant") btnLabel = "Only Tenant Can Book";
                else if (booked) btnLabel = "Booked";

                const disabled = booked || (token && role !== "tenant");

                return (
                  <div
                    key={item.id}
                    style={card}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 22px 70px rgba(0,0,0,0.50)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 16px 55px rgba(0,0,0,0.35)";
                    }}
                  >
                    {/* Image */}
                    <div style={{ position: "relative" }}>
                      <img
                        src={thumb}
                        alt={item.title || "listing"}
                        style={img}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/no-image.png";
                        }}
                      />

                      {has360 && (
                        <button onClick={() => nav(`/listing/${item.id}/360`)} style={overlay360}>
                          View 360°
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: 14 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={tag}>{item.property_type || "property"}</span>
                        {booked && <span style={tagBooked}>Booked</span>}
                      </div>

                      <h4 style={{ margin: "10px 0 6px", color: "#e5e7eb" }}>
                        {item.title || "About Property"}
                      </h4>

                      <div style={{ color: "rgba(229,231,235,0.86)", fontSize: 13, display: "grid", gap: 6 }}>
                        <div>
                          <b>Location:</b> {item.location || "-"}
                        </div>
                        <div>
                          <b>Price:</b> ${item.price_per_week}/week
                        </div>
                      </div>

                      <p style={{ margin: "10px 0 0", color: "rgba(229,231,235,0.75)", fontSize: 13, lineHeight: 1.5 }}>
                        {(item.description || "This property is ...").slice(0, 90)}
                        {(item.description || "").length > 90 ? "..." : ""}
                      </p>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                        <button onClick={() => nav(`/listings/${item.id}`)} style={actionBtn}>
                          Details
                        </button>

                        <button
                          style={bookingBtn(disabled)}
                          disabled={disabled}
                          onClick={() => {
                            if (!token) return nav("/auth");
                            if (role !== "tenant") return nav("/unauthorized");
                            nav(`/tenant/book/${item.id}`);
                          }}
                        >
                          {btnLabel}
                        </button>

                        {has360 && (
                          <button onClick={() => nav(`/listing/${item.id}/360`)} style={actionBtn}>
                            360°
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
