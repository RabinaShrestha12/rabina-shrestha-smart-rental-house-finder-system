import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function TenantBookPage() {
  const { listing_id } = useParams();
  const navigate = useNavigate();

  const book = async () => {
    try {
      const res = await api.post(`/api/tenant/book/${listing_id}/`);
      alert(res.data?.message || "Booked!");
      navigate("/");
    } catch (e) {
      alert(e?.response?.data?.detail || "Booking failed");
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      <h2>Confirm Booking</h2>
      <p>Property ID: {listing_id}</p>
      <button onClick={book}>Confirm Booking</button>
    </div>
  );
}
