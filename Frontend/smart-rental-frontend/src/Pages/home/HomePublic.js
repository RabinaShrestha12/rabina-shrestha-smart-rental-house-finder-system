import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

export default function HomePublic() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");

  const navigate = useNavigate();

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/public/listings/", { params: { q, location, type } });
      setListings(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topBtn = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      {/* ✅ Header row with Login button on right */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Smart Rental House Finder System</h2>

        <button onClick={() => navigate("/auth")} style={topBtn}>
          Login
        </button>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Search</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Search title"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="">All</option>
            <option value="room">Room</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>

          <button onClick={loadListings} style={{ padding: "10px 16px", borderRadius: 8, cursor: "pointer" }}>
            Search
          </button>
        </div>
      </div>

      <h3>Available Listings</h3>

      {loading && <p>Loading...</p>}
      {!loading && listings.length === 0 && <p>No listings found.</p>}

      {!loading &&
        listings.map((item) => {
          const has360 =
            item.pano_front_url &&
            item.pano_back_url &&
            item.pano_left_url &&
            item.pano_right_url &&
            item.pano_up_url &&
            item.pano_down_url;

          const thumb = item.pano_front_url || item.image_url || "/no-image.png";

          return (
            <div
              key={item.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
                display: "flex",
                gap: 16,
              }}
            >
              <div
                onClick={() => has360 && navigate(`/listing/${item.id}/360`)}
                style={{
                  width: 200,
                  height: 140,
                  background: "#f3f3f3",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #ccc",
                  cursor: has360 ? "pointer" : "default",
                  position: "relative",
                }}
              >
                <img
                  src={thumb}
                  alt={item.title || "listing"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => (e.currentTarget.src = "/no-image.png")}
                />

                {has360 && (
                  <div
                    style={{
                      position: "absolute",
                      right: 8,
                      bottom: 8,
                      background: "rgba(0,0,0,0.65)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  >
                    View 360°
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ marginTop: 0 }}>{item.title}</h4>
                <p>
                  <b>Type:</b> {item.property_type}
                </p>
                <p>
                  <b>Location:</b> {item.location}
                </p>
                <p>
                  <b>Price:</b> ${item.price_per_week}/week
                </p>
                <p>{item.description}</p>
              </div>
            </div>
          );
        })}
    </div>
  );
}
