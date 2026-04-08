// src/components/ReviewsBox.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useTheme } from "./ThemeContext";
import { Star, MessageSquare, Send, Calendar } from "lucide-react";

export default function ReviewsBox({ listingId, canReview = false }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("access");

  const ui = {
    card: isDark ? "bg-[#10233f] border border-white/5" : "bg-white border border-neutral-100 shadow-sm",
    input: isDark ? "bg-[#0d1b33] border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500",
    text: isDark ? "text-white" : "text-neutral-900",
    subText: isDark ? "text-slate-400" : "text-neutral-500",
  };

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
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg = data?.detail || (typeof data === "string" ? data : "") || "Failed to save review";
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <MessageSquare className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
        <h3 className={`text-2xl font-black ${ui.text}`}>Reviews</h3>
      </div>

      {canReview && (
        <div className={`p-6 rounded-[28px] border transition-all ${ui.card}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
               <div className={`text-sm font-bold uppercase tracking-wider ${ui.subText}`}>Your Rating</div>
               <div className="flex gap-1">
                 {[1, 2, 3, 4, 5].map((num) => (
                   <button 
                     key={num} 
                     onClick={() => setRating(num)}
                     className={`transition-all ${num <= rating ? "text-amber-400 scale-110" : "text-slate-300"}`}
                   >
                     <Star className={`w-6 h-6 ${num <= rating ? "fill-current" : ""}`} />
                   </button>
                 ))}
               </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your experience with this property..."
              className={`w-full p-4 rounded-2xl border outline-none transition-all resize-none text-sm leading-relaxed ${ui.input}`}
            />

            <button
              onClick={submit}
              disabled={loading || !comment.trim()}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                loading || !comment.trim()
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 hover:-translate-y-0.5"
              }`}
            >
              <Send className="w-4 h-4" />
              {loading ? "Posting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {reviews.length === 0 ? (
          <div className={`py-12 text-center rounded-[28px] border border-dashed ${isDark ? "border-white/10 bg-[#0d1b33]" : "border-slate-200 bg-slate-50"}`}>
            <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className={`font-medium ${ui.subText}`}>No reviews yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className={`p-6 rounded-[28px] border transition-all ${ui.card}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= r.rating ? "text-amber-400 fill-current" : "text-slate-300"}`} />
                      ))}
                    </div>
                    <span className={`text-sm font-black ${ui.text}`}>Rating: {r.rating}/5</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${ui.mutedText}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
                  </div>
                </div>
                {r.comment && (
                  <p className={`text-sm leading-relaxed ${ui.subText}`}>
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
