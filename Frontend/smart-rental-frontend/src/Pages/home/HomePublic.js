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

  const load = async () => {
    setLoading(true);
    try {
      // ✅ match your backend URL
      const res = await api.get("/api/public/listings/", {
        params: { q, location, type },
      });
      setListings(res.data);
    } catch (e) {
      alert("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const bookClick = (id) => {
    const token = localStorage.getItem("access");
    if (!token) return navigate("/auth");
    return navigate(`/tenant/book/${id}`);
  };

  const addPropertyClick = () => {
    const token = localStorage.getItem("access");
    if (!token) return navigate("/auth");
    return navigate("/owner/listings/create");
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h2>Smart Rental House Finder System</h2>
      <p>Browse properties publicly. Login is required to book or add property.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/auth")}>Login / Register</button>
        <button onClick={addPropertyClick}>Add Your Property (Owner)</button>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Search</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="room">Room</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>
          <button onClick={load}>Search</button>
          <button onClick={() => { setQ(""); setLocation(""); setType(""); }}>Reset</button>
        </div>
      </div>

      <h3>Available Listings</h3>
      {loading && <p>Loading...</p>}
      {!loading && listings.length === 0 && <p>No listings found.</p>}

      {!loading && listings.map((item) => (
        <div
          key={item.id}
          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", gap: 12 }}
        >
          <div style={{ width: 200, height: 140, background: "#f3f3f3", borderRadius: 8, overflow: "hidden" }}>
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                No Image
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>{item.title}</h4>
            <div><b>Type:</b> {item.property_type}</div>
            <div><b>Price:</b> ${item.price_per_week}/week</div>
            <div><b>Location:</b> {item.location}</div>
            <p>{item.description}</p>

            <button onClick={() => bookClick(item.id)}>Book (Login required)</button>
          </div>
        </div>
      ))}
    </div>
  );
}
