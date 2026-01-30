import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function PublicListingDetails() {
  const { id } = useParams();
  const nav = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("access");
  const role = localStorage.getItem("role"); // tenant/owner/admin

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // ✅ Your backend detail endpoint should be like this:
        const res = await api.get(`/public/listings/${id}/`);
        setListing(res.data);
      } catch (e) {
        console.error(e);
        alert("Failed to load property details.");
        nav("/", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, nav]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!listing) return <div style={{ padding: 20 }}>Not found.</div>;

  const cover = toImageSrc(listing.image_url || listing.image || listing.pano_front_url);

  const price =
    listing.price_per_month != null
      ? { value: listing.price_per_month, label: "/month" }
      : { value: listing.price_per_week, label: "/week" };

  const has360 =
    listing.pano_front_url &&
    listing.pano_back_url &&
    listing.pano_left_url &&
    listing.pano_right_url &&
    listing.pano_up_url &&
    listing.pano_down_url;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      {/* Top buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => nav(-1)}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: 700 }}
        >
          ← Back
        </button>

        {has360 && (
          <button
            onClick={() => nav(`/listing/${listing.id}/360`)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: 700 }}
          >
            View 360°
          </button>
        )}

        <button
          onClick={() => {
            if (!token) return nav("/auth");
            if (role !== "tenant") return nav("/unauthorized");
            nav(`/tenant/book/${listing.id}`);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: !token || role !== "tenant" ? "#cfcfcf" : "#16a34a",
            color: !token || role !== "tenant" ? "#333" : "#fff",
            cursor: !token || role !== "tenant" ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
          disabled={!token || role !== "tenant"}
          title={!token ? "Login to book" : role !== "tenant" ? "Only tenant can book" : ""}
        >
          {!token ? "Login to Book" : role !== "tenant" ? "Only Tenant Can Book" : "Request Booking"}
        </button>
      </div>

      {/* Main card */}
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, display: "flex", gap: 16 }}>
        {/* Image */}
        <img
          src={cover}
          alt="cover"
          style={{ width: 360, height: 240, objectFit: "cover", borderRadius: 12, border: "1px solid #ccc", background: "#f7f7f7" }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/no-image.png";
          }}
        />

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>{listing.title}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><b>Type:</b> {listing.property_type}</div>
            <div><b>Location:</b> {listing.location}</div>
            <div><b>Price:</b> ${price.value}{price.label}</div>
            {listing.electricity_bill && <div><b>Electricity:</b> {listing.electricity_bill}</div>}
            {listing.owner_contact_number && <div><b>Owner phone:</b> {listing.owner_contact_number}</div>}
            {listing.owner_contact_email && <div><b>Owner email:</b> {listing.owner_contact_email}</div>}
          </div>

          <div style={{ marginTop: 12 }}>
            <b>Description</b>
            <p style={{ marginTop: 6, lineHeight: 1.5 }}>{listing.description || "No description."}</p>
          </div>
        </div>
      </div>

      {/* 360 images preview */}
      {has360 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>360 Photos (6 sides)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              ["Front", listing.pano_front_url],
              ["Back", listing.pano_back_url],
              ["Left", listing.pano_left_url],
              ["Right", listing.pano_right_url],
              ["Up", listing.pano_up_url],
              ["Down", listing.pano_down_url],
            ].map(([label, url]) => (
              <div key={label} style={{ border: "1px solid #eee", padding: 10, borderRadius: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
                <img
                  src={toImageSrc(url)}
                  alt={label}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, border: "1px solid #ccc" }}
                  onError={(e) => (e.currentTarget.src = "/no-image.png")}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
