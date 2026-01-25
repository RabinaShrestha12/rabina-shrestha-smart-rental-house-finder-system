import React, { useEffect, useState } from "react";
import api from "../../api/axios";

const BACKEND = "http://127.0.0.1:8000";

function normalizeMediaUrl(val) {
  if (!val) return "/no-image.png";

  // convert to string
  const s = String(val);

  // ✅ if it is already a full URL, use directly
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // ✅ if data is wrongly like "/media/http://127.0.0.1:8000/media/xyz.jpg"
  // fix it by removing the leading "/media/"
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }

  // ✅ normal correct relative: "/media/xyz.jpg"
  if (s.startsWith("/")) return `${BACKEND}${s}`;

  // ✅ relative without slash: "media/xyz.jpg" or "listings/xyz.jpg"
  return `${BACKEND}/${s}`;
}

export default function PublicListings() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    api.get("/public/listings/?q=&location=&type=")
      .then((res) => setListings(res.data || []))
      .catch((err) => console.error("Public listings error:", err));
  }, []);

  return (
    <div className="p-10 text-white">
      <h2 className="text-2xl mb-6">Available Listings</h2>

      {listings.length === 0 ? (
        <p>No listings found.</p>
      ) : (
        listings.map((l) => {
          // ✅ Prefer image_url, fallback to image
          const src = normalizeMediaUrl(l.image_url || l.image);

          return (
            <div
              key={l.id}
              className="mb-4 p-4 border rounded flex gap-4 items-start"
            >
              <img
                src={src}
                alt={l.title || "listing"}
                className="w-40 h-28 object-cover rounded bg-white"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/no-image.png";
                }}
              />

              <div>
                <h3 className="font-semibold">{l.title}</h3>
                <p>{l.location}</p>
                <p>${l.price_per_week}/week</p>

                {/* Debug (remove later) */}
                <p className="text-xs opacity-70 break-all mt-2">
                  image: {String(l.image)} <br />
                  image_url: {String(l.image_url)} <br />
                  final_src: {src}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
