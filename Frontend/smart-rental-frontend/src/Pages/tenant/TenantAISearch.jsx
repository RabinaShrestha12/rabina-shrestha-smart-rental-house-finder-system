// src/pages/tenant/TenantAISearch.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";

export default function TenantAISearch() {
  const nav = useNavigate();
  const [place, setPlace] = useState("");
  const [radiusKm, setRadiusKm] = useState(2);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [propertyType, setPropertyType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);

  // ✅ Google Maps link helper
  const mapsUrl = (x) => {
    // Prefer coordinates
    if (x?.latitude != null && x?.longitude != null) {
      return `https://www.google.com/maps?q=${x.latitude},${x.longitude}`;
    }
    // Fallback to search by text
    const q = encodeURIComponent(`${x?.title || ""} ${x?.location || ""}`.trim());
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  };

  const runAISearch = async () => {
    setErr("");
    setLoading(true);
    setResults([]);
    try {
      const res = await api.post("tenant/ai/suggest/", {
        place,
        radius_km: Number(radiusKm),
        min_price: minPrice === "" ? null : Number(minPrice),
        max_price: maxPrice === "" ? null : Number(maxPrice),
        property_type: propertyType,
      });

      setResults(res.data?.results || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to get AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="AI Smart Search"
      subtitle="Type a place + radius + budget and get nearby listing suggestions."
      right={
        <div className="flex gap-2">
          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            ← Back
          </button>
          <button
            onClick={() => nav("/reminders")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            🔔 Notifications
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Enter place (e.g., Kogarah, Canberra, Sundarharaicha...)"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
          />

          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
          >
            <option value={1}>1 km</option>
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
            <option value={15}>15 km</option>
          </select>

          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
          >
            <option value="all">All types</option>
            <option value="room">Room</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
          </select>

          <input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min price"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
          />

          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max price"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
          />

          <button
            onClick={runAISearch}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
          >
            {loading ? "Searching..." : "✨ AI Suggest"}
          </button>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4">
          {results.length === 0 && !loading && !err ? (
            <div className="text-sm text-slate-300">
              No results yet. Run AI search to see nearby properties.
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((x) => (
                <div
                  key={x.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  {/* ✅ House/Listing name */}
                  <div className="text-sm font-semibold line-clamp-1">
                    {x.title}
                  </div>

                  {/* ✅ Full location */}
                  <div className="mt-1 text-xs text-slate-300 line-clamp-2">
                    {x.location}
                  </div>

                  <div className="mt-2 text-xs text-slate-300">
                    Rs {x.price_per_month} • {x.property_type} • {x.distance_km} km away
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => nav(`/public/listings/${x.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs hover:bg-white/15 transition"
                    >
                      View
                    </button>

                    <button
                      onClick={() => nav(`/tenant/book/${x.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                    >
                      Request Visit
                    </button>

                    {/* ✅ Open directly in Google Maps */}
                    <a
                      href={mapsUrl(x)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-white/10 bg-emerald-500/15 px-3 py-2 text-xs hover:bg-emerald-500/25 transition"
                      title="Open location in Google Maps"
                    >
                      📍 Open Map
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 text-xs text-slate-400">
          ✅ After every AI search, a notification is created automatically. Open Notifications to see it later.
        </div>
      </div>
    </Shell>
  );
}