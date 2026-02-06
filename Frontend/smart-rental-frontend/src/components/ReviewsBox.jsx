// src/components/ReviewsBox.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function ReviewsBox({ listingId, canReview = false }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("access");

  async function load() {
    try {
      const res = await api.get(`listings/${listingId}/reviews/`);
      setReviews(res.data || []);
    } catch (e) {
      console.log("REVIEWS LOAD ERROR:", e?.response?.status, e?.response?.data);
    }
  }

  useEffect(() => {
    if (listingId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function submit() {
    if (!token) {
      alert("Please login as tenant first.");
      return;
    }

    setLoading(true);
    try {
      // ✅ Force token header (fixes 401 if your axios interceptor isn't adding it)
      const res = await api.post(
        "reviews/create/",
        {
          listing: Number(listingId),
          rating: Number(rating),
          comment,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setComment("");
      await load();
      alert("✅ Review saved!");
      return res.data;
    } catch (e) {
      // ✅ Show the REAL backend reason
      const status = e?.response?.status;
      const data = e?.response?.data;

      console.log("REVIEW SAVE ERROR:", status, data, e);

      const msg =
        data?.detail ||
        (typeof data === "string" ? data : "") ||
        JSON.stringify(data || {}) ||
        "Failed to save review";

      alert(msg);

      // Helpful hints in console:
      if (status === 403) {
        console.log(
          "TIP: Backend requires BookingRequest exists before review. Click 'Request Booking' first OR remove booking restriction."
        );
      }
      if (status === 401) {
        console.log("TIP: Token missing/expired or backend auth not configured for this endpoint.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>Reviews</h3>

      {canReview && (
        <div style={{ padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Rating</div>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            >
              {[5, 4, 3, 2, 1].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Write your feedback..."
            style={{
              width: "100%",
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              resize: "vertical",
            }}
          />

          <button
            onClick={submit}
            disabled={loading}
            style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: loading ? "#93c5fd" : "#3b82f6",
              color: "#fff",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "Submit review"}
          </button>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {reviews.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No reviews yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Rating: {r.rating}/5</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </div>
                </div>
                {r.comment ? <div style={{ marginTop: 8 }}>{r.comment}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
