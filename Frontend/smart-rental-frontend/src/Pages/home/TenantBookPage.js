import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function TenantBookPage() {
  const { listing_id } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    try {
      // ✅ baseURL already has /api so DO NOT add /api here
      const res = await api.post(`/tenant/request-booking/${listing_id}/`, {
        message,
      });

      alert(res.data?.message || "✅ Request sent to owner!");
      navigate("/");
    } catch (e) {
      const errMsg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        "❌ Request failed (login required)";
      alert(errMsg);
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
