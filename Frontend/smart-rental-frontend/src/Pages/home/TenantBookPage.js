import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function TenantBookPage() {
  const { listing_id } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    const token = localStorage.getItem("access");
    const role = localStorage.getItem("role");

    if (!token) {
      alert("Login required. Please login first.");
      navigate("/auth");
      return;
    }
    if (role !== "tenant") {
      alert("Only tenant can send booking request.");
      navigate("/unauthorized");
      return;
    }
    if (!message.trim()) {
      alert("Please write a message.");
      return;
    }

    setLoading(true);
    try {
      // ✅ correct endpoint from urls.py
      const res = await api.post(
        "tenant/booking-requests/create/",
        {
          listing: Number(listing_id),
          message: message.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(res.data?.message || "✅ Request sent to owner!");
      navigate(`/public/listings/${listing_id}`);
    } catch (e) {
      console.log("BOOKING ERROR:", e?.response?.status, e?.response?.data);

      const errMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        "❌ Request failed";

      alert(errMsg);

      if (e?.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        alert("Session expired. Please login again.");
        navigate("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      <h2>Request Booking</h2>
      <p>
        <b>Listing ID:</b> {listing_id}
      </p>

      <label style={{ fontWeight: 700 }}>Message to Owner</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Example: I am a student/worker, move-in date, budget, how many people..."
        style={{
          width: "100%",
          minHeight: 130,
          padding: 10,
          borderRadius: 10,
          border: "1px solid #ccc",
          marginTop: 8,
        }}
      />

      <button
        onClick={sendRequest}
        disabled={loading}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Sending..." : "Send Booking Request"}
      </button>
    </div>
  );
}
