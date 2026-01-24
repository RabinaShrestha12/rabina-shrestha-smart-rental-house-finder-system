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
      const res = await api.get("/public/listings/", {
        params: { q, location, type },
      });

      console.log("PUBLIC LISTINGS:", res.data);
      setListings(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const bookClick = (id) => {
    const token = localStorage.getItem("access");
    if (!token) return navigate("/auth");
    navigate(`/tenant/book/${id}`);
  };

  const addPropertyClick = () => {
    const token = localStorage.getItem("access");
    if (!token) return navigate("/auth");
    navigate("/owner/listings/create");
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h2>Smart Rental House Finder System</h2>
      <p>
        Browse properties publicly. Login is required to book or add property.
      </p>

      {/* ACTION BUTTONS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button onClick={() => navigate("/auth")}>Login / Register</button>
        <button onClick={addPropertyClick}>Add Your Property (Owner)</button>
      </div>

      {/* SEARCH BOX */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <h3>Search</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Search title"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="room">Room</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>
          <button onClick={loadListings}>Search</button>
          <button
            onClick={() => {
              setQ("");
              setLocation("");
              setType("");
              loadListings();
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* LISTINGS */}
      <h3>Available Listings</h3>

      {loading && <p>Loading...</p>}
      {!loading && listings.length === 0 && <p>No listings found.</p>}

      {!loading &&
        listings.map((item) => (
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
            {/* IMAGE */}
            <div
              style={{
                width: 200,
                height: 140,
                background: "#f3f3f3",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #ccc",
              }}
            >
              {item.image ? (
                <img
                  src={`http://127.0.0.1:8000/media/${item.image}`}
                  alt={item.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    color: "#666",
                  }}
                >
                  No Image
                </div>
              )}
            </div>

            {/* DETAILS */}
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

              <button onClick={() => bookClick(item.id)}>
                Book (Login required)
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
