import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function weekToMonth(weekly) {
  const n = Number(weekly);
  if (Number.isNaN(n) || n <= 0) return null;
  return n * 4.345;
}

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function HomePublic() {
  const nav = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");

  const goToAuth = (redirectTo) => {
    sessionStorage.setItem("post_login_redirect", redirectTo);
    nav("/auth");
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await api.get("public/listings/", {
        params: { q, location, type },
      });

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];

      setListings(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load listings");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setQ("");
    setLocation("");
    setType("");
    setTimeout(() => {
      setLoading(true);
      api
        .get("public/listings/", {
          params: { q: "", location: "", type: "" },
        })
        .then((res) => {
          const data = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.results)
            ? res.data.results
            : [];
          setListings(data);
        })
        .catch((err) => {
          console.error(err);
          alert("Failed to load listings");
          setListings([]);
        })
        .finally(() => setLoading(false));
    }, 0);
  };

  const handleBookingClick = (listingId, booked) => {
    if (booked) return;

    const t = localStorage.getItem("access");
    const r = localStorage.getItem("role");

    if (!t) return goToAuth(`/tenant/book/${listingId}`);

    if (r !== "tenant") {
      alert("Please login as Tenant to book a property.");
      return goToAuth(`/tenant/book/${listingId}`);
    }

    nav(`/tenant/book/${listingId}`);
  };

  const stats = useMemo(() => {
    const available = listings.filter((x) => x?.is_available !== false).length;
    const with360 = listings.filter(
      (x) =>
        x?.pano_front_url &&
        x?.pano_back_url &&
        x?.pano_left_url &&
        x?.pano_right_url &&
        x?.pano_up_url &&
        x?.pano_down_url
    ).length;

    return {
      total: listings.length,
      available,
      with360,
    };
  }, [listings]);

  const css = `
    * { box-sizing: border-box; }

    .hp-page {
      min-height: 100vh;
      padding: 28px 16px 42px;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(700px 420px at 10% 12%, rgba(14,165,233,.18) 0%, rgba(14,165,233,0) 60%),
        radial-gradient(720px 460px at 90% 10%, rgba(168,85,247,.16) 0%, rgba(168,85,247,0) 60%),
        radial-gradient(700px 400px at 20% 88%, rgba(16,185,129,.10) 0%, rgba(16,185,129,0) 60%),
        linear-gradient(180deg, #06111f 0%, #07152a 40%, #08162d 100%);
    }

    .hp-shell {
      max-width: 1280px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    .hp-glow {
      position: absolute;
      inset: auto;
      border-radius: 999px;
      filter: blur(50px);
      pointer-events: none;
      opacity: .55;
      animation: floatGlow 10s ease-in-out infinite;
    }

    .hp-glow.one {
      width: 260px;
      height: 260px;
      left: -40px;
      top: 70px;
      background: rgba(6, 182, 212, 0.18);
    }

    .hp-glow.two {
      width: 320px;
      height: 320px;
      right: -60px;
      top: 40px;
      background: rgba(147, 51, 234, 0.16);
      animation-delay: -2s;
    }

    .hp-glow.three {
      width: 240px;
      height: 240px;
      left: 28%;
      bottom: 60px;
      background: rgba(16, 185, 129, 0.10);
      animation-delay: -5s;
    }

    @keyframes floatGlow {
      0%,100% { transform: translateY(0) translateX(0) scale(1); }
      50% { transform: translateY(-16px) translateX(10px) scale(1.04); }
    }

    .hp-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .hp-brand {
      display: grid;
      gap: 10px;
    }

    .hp-brand-badge {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.05);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .02em;
    }

    .hp-title {
      margin: 0;
      color: #f8fafc;
      font-size: 48px;
      line-height: 1.02;
      font-weight: 950;
      letter-spacing: -0.05em;
      max-width: 760px;
    }

    .hp-sub {
      margin: 0;
      color: rgba(226,232,240,.76);
      font-size: 16px;
      line-height: 1.8;
      max-width: 760px;
    }

    .hp-nav-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hp-btn {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 18px;
      padding: 13px 18px;
      color: #e2e8f0;
      font-weight: 900;
      cursor: pointer;
      background: rgba(255,255,255,.06);
      backdrop-filter: blur(14px);
      box-shadow: 0 12px 32px rgba(0,0,0,.20);
      transition: all .18s ease;
    }

    .hp-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 40px rgba(0,0,0,.28);
    }

    .hp-btn.primary {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #fff;
    }

    .hp-btn.map {
      background: linear-gradient(135deg, rgba(34,197,94,.18) 0%, rgba(56,189,248,.18) 100%);
      color: #e0f2fe;
    }

    .hp-glass {
      border: 1px solid rgba(255,255,255,.10);
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.04));
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
      border-radius: 26px;
    }

    .hp-hero {
      display: grid;
      grid-template-columns: 1.1fr .9fr;
      gap: 20px;
      padding: 22px;
      margin-bottom: 18px;
    }

    .hp-hero-left {
      padding: 8px 6px 6px;
    }

    .hp-hero-heading {
      margin: 0;
      color: #f8fafc;
      font-size: 38px;
      line-height: 1.08;
      font-weight: 950;
      letter-spacing: -0.04em;
      max-width: 650px;
    }

    .hp-hero-copy {
      margin: 16px 0 0;
      color: rgba(226,232,240,.78);
      font-size: 15px;
      line-height: 1.8;
      max-width: 640px;
    }

    .hp-pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    .hp-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 800;
    }

    .hp-showcase {
      position: relative;
      min-height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 1200px;
    }

    .hp-stack {
      position: relative;
      width: 100%;
      max-width: 430px;
      height: 300px;
    }

    .hp-stack-card {
      position: absolute;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,.12);
      background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.05));
      box-shadow: 0 22px 60px rgba(0,0,0,.28);
      overflow: hidden;
      backdrop-filter: blur(12px);
    }

    .hp-stack-card.card-back {
      width: 72%;
      height: 170px;
      right: 2%;
      top: 10px;
      transform: rotate(7deg);
      opacity: .92;
      background: linear-gradient(135deg, rgba(168,85,247,.18), rgba(59,130,246,.08));
    }

    .hp-stack-card.card-mid {
      width: 78%;
      height: 185px;
      left: 2%;
      top: 62px;
      transform: rotate(-7deg);
      opacity: .95;
      background: linear-gradient(135deg, rgba(14,165,233,.18), rgba(16,185,129,.08));
    }

    .hp-stack-card.card-front {
      width: 86%;
      min-height: 210px;
      left: 7%;
      top: 48px;
      transform: rotate(0deg) translateZ(20px);
      padding: 18px;
      display: grid;
      gap: 16px;
    }

    .hp-mini-label {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .hp-mini-value {
      color: #fff;
      font-size: 28px;
      line-height: 1;
      font-weight: 950;
    }

    .hp-mini-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .hp-mini-box {
      padding: 14px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
    }

    .hp-search-panel {
      padding: 18px;
      margin-bottom: 18px;
    }

    .hp-search-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr .75fr auto auto;
      gap: 12px;
      align-items: end;
    }

    .hp-label {
      margin-bottom: 8px;
      color: #e2e8f0;
      font-size: 14px;
      font-weight: 900;
    }

    .hp-hint {
      color: rgba(226,232,240,.68);
      font-size: 12px;
      margin-top: 6px;
    }

    .hp-input {
      width: 100%;
      padding: 14px 15px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(15,23,42,.58);
      color: #e5e7eb;
      outline: none;
      transition: all .18s ease;
    }

    .hp-input:focus {
      border-color: rgba(96,165,250,.75);
      box-shadow: 0 0 0 4px rgba(59,130,246,.12);
      transform: translateY(-1px);
    }

    .hp-section-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .hp-section-title {
      margin: 0;
      color: #f8fafc;
      font-size: 32px;
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: -0.04em;
    }

    .hp-section-sub {
      margin-top: 8px;
      color: rgba(226,232,240,.70);
      font-size: 14px;
    }

    .hp-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.06);
      color: #dbeafe;
      font-size: 12px;
      font-weight: 900;
    }

    .hp-listing-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
      margin-top: 16px;
    }

    .hp-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.10);
      background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.045));
      box-shadow: 0 16px 45px rgba(0,0,0,.30);
      transition: all .22s ease;
    }

    .hp-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 28px 70px rgba(0,0,0,.42);
      border-color: rgba(255,255,255,.18);
    }

    .hp-card-media {
      position: relative;
      height: 220px;
      overflow: hidden;
      background: rgba(255,255,255,.04);
    }

    .hp-card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform .34s ease;
    }

    .hp-card:hover .hp-card-media img {
      transform: scale(1.06);
    }

    .hp-media-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,.03) 8%, rgba(0,0,0,.14) 55%, rgba(2,6,23,.82) 100%);
      pointer-events: none;
    }

    .hp-360-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(0,0,0,.48);
      color: #fff;
      font-weight: 900;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all .18s ease;
      z-index: 2;
    }

    .hp-360-btn:hover {
      background: rgba(0,0,0,.62);
      transform: translateY(-1px);
    }

    .hp-media-bottom {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      z-index: 2;
    }

    .hp-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(59,130,246,.16);
      color: #dbeafe;
      font-size: 12px;
      font-weight: 900;
      backdrop-filter: blur(8px);
    }

    .hp-chip.booked {
      background: rgba(245,158,11,.18);
      color: #fde68a;
    }

    .hp-chip.price {
      background: rgba(16,185,129,.22);
      color: #d1fae5;
    }

    .hp-card-body {
      padding: 16px 16px 18px;
    }

    .hp-card-title {
      margin: 0;
      color: #f8fafc;
      font-size: 26px;
      line-height: 1.04;
      font-weight: 950;
      letter-spacing: -0.03em;
    }

    .hp-card-meta {
      margin-top: 12px;
      display: grid;
      gap: 8px;
      color: rgba(226,232,240,.82);
      font-size: 13px;
      line-height: 1.55;
    }

    .hp-card-desc {
      margin-top: 12px;
      min-height: 46px;
      color: rgba(226,232,240,.68);
      font-size: 13px;
      line-height: 1.7;
    }

    .hp-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-top: 16px;
    }

    .hp-action-btn {
      padding: 11px 12px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.07);
      color: #e5e7eb;
      font-weight: 900;
      cursor: pointer;
      transition: all .18s ease;
    }

    .hp-action-btn:hover {
      transform: translateY(-1px);
      background: rgba(255,255,255,.11);
      box-shadow: 0 12px 28px rgba(0,0,0,.20);
    }

    .hp-action-btn.booking {
      background: linear-gradient(135deg, rgba(34,197,94,.95), rgba(16,185,129,.95));
      color: #052111;
    }

    .hp-action-btn.booking.disabled {
      background: rgba(148,163,184,.22);
      color: rgba(226,232,240,.85);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .hp-empty {
      color: #e5e7eb;
      padding: 18px 0 6px;
      font-size: 15px;
    }

    @media (max-width: 1200px) {
      .hp-listing-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 960px) {
      .hp-hero {
        grid-template-columns: 1fr;
      }
      .hp-search-grid {
        grid-template-columns: 1fr;
      }
      .hp-listing-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .hp-title {
        font-size: 38px;
      }
      .hp-hero-heading {
        font-size: 32px;
      }
    }

    @media (max-width: 560px) {
      .hp-page {
        padding: 18px 12px 32px;
      }
      .hp-title {
        font-size: 30px;
      }
      .hp-hero-heading {
        font-size: 26px;
      }
      .hp-listing-grid {
        grid-template-columns: 1fr;
      }
      .hp-card-actions {
        grid-template-columns: 1fr;
      }
      .hp-nav-actions {
        width: 100%;
      }
      .hp-nav-actions .hp-btn {
        flex: 1;
      }
    }
  `;

  return (
    <div className="hp-page">
      <style>{css}</style>

      <div className="hp-glow one" />
      <div className="hp-glow two" />
      <div className="hp-glow three" />

      <div className="hp-shell">
        <div className="hp-nav">
          <div className="hp-brand">
            <span className="hp-brand-badge">✨ New modern home experience</span>
            <h1 className="hp-title">Smart Rental House Finder System</h1>
            <p className="hp-sub">
              Discover rooms, apartments, and houses in a cleaner and more modern
              way. Public browsing, 360° tours, map search, and tenant booking in
              one place.
            </p>
          </div>

          <div className="hp-nav-actions">
            <button onClick={() => nav("/auth")} className="hp-btn primary">
              Login / Register
            </button>
            <button onClick={() => nav("/map")} className="hp-btn map">
              🗺️ Search on Map
            </button>
          </div>
        </div>

        <div className="hp-glass hp-hero">
          <div className="hp-hero-left">
            <h2 className="hp-hero-heading">
              Find your next room or house with a stylish first impression
            </h2>

            <p className="hp-hero-copy">
              Search by title, location, and type. View immersive property
              previews, compare options faster, and move from browsing to booking
              without confusion.
            </p>

            <div className="hp-pills">
              <span className="hp-pill">🏠 Public Listings</span>
              <span className="hp-pill">📸 360° Tour</span>
              <span className="hp-pill">🗺️ Map Search</span>
              <span className="hp-pill">💬 Fast Booking Flow</span>
            </div>
          </div>

          <div className="hp-showcase">
            <div className="hp-stack">
              <div className="hp-stack-card card-back" />
              <div className="hp-stack-card card-mid" />
              <div className="hp-stack-card card-front">
                <div>
                  <div className="hp-mini-label">Premium Search</div>
                  <div className="hp-mini-value">Find faster</div>
                </div>

                <div className="hp-mini-grid">
                  <div className="hp-mini-box">
                    <div className="hp-mini-label">Listings</div>
                    <div className="hp-mini-value">{stats.total}</div>
                  </div>

                  <div className="hp-mini-box">
                    <div className="hp-mini-label">Available</div>
                    <div className="hp-mini-value">{stats.available}</div>
                  </div>

                  <div className="hp-mini-box">
                    <div className="hp-mini-label">360° Tours</div>
                    <div className="hp-mini-value">{stats.with360}</div>
                  </div>

                  <div className="hp-mini-box">
                    <div className="hp-mini-label">Experience</div>
                    <div className="hp-mini-value">Modern</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hp-glass hp-search-panel">
          <div className="hp-search-grid">
            <div>
              <div className="hp-label">Search</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search title, e.g. "room near college"'
                className="hp-input"
              />
              <div className="hp-hint">
                Example: “room”, “house”, “near college”
              </div>
            </div>

            <div>
              <div className="hp-label">Location</div>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder='Search by city or area, e.g. "Ithari"'
                className="hp-input"
              />
              <div className="hp-hint">Example: “Ithari”, “Canberra”</div>
            </div>

            <div>
              <div className="hp-label">Type</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="hp-input"
              >
                <option value="">All</option>
                <option value="room">Room</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
              </select>
              <div className="hp-hint">Choose one type</div>
            </div>

            <button onClick={loadListings} className="hp-btn primary">
              Search
            </button>

            <button onClick={reset} className="hp-btn">
              Reset
            </button>
          </div>
        </div>

        <div>
          <div className="hp-section-head">
            <div>
              <h3 className="hp-section-title">Available Listings</h3>
              <div className="hp-section-sub">
                Browse public properties and open details before login.
              </div>
            </div>

            {!loading && <span className="hp-count">{listings.length} found</span>}
          </div>

          {loading && <p className="hp-empty">Loading...</p>}

          {!loading && listings.length === 0 && (
            <p className="hp-empty">No listings found.</p>
          )}

          <div className="hp-listing-grid">
            {!loading &&
              listings.map((item) => {
                const has360 =
                  item.pano_front_url &&
                  item.pano_back_url &&
                  item.pano_left_url &&
                  item.pano_right_url &&
                  item.pano_up_url &&
                  item.pano_down_url;

                const thumb = toImageSrc(
                  item.pano_front_url || item.image_url || item.image
                );

                const booked = item.is_available === false;

                const monthPriceRaw =
                  item.price_per_month ??
                  (item.price_per_week ? weekToMonth(item.price_per_week) : null);

                const monthPriceText =
                  monthPriceRaw == null ? "-" : money(monthPriceRaw);

                const btnLabel = booked ? "Booked" : "Booking";
                const disabled = booked;

                return (
                  <div key={item.id} className="hp-card">
                    <div className="hp-card-media">
                      <img
                        src={thumb}
                        alt={item.title || "listing"}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/no-image.png";
                        }}
                      />

                      <div className="hp-media-overlay" />

                      {has360 && (
                        <button
                          onClick={() => nav(`/listing/${item.id}/360`)}
                          className="hp-360-btn"
                        >
                          View 360°
                        </button>
                      )}

                      <div className="hp-media-bottom">
                        <span className="hp-chip">
                          {item.property_type || "property"}
                        </span>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {booked && <span className="hp-chip booked">Booked</span>}
                          <span className="hp-chip price">
                            ${monthPriceText}/month
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="hp-card-body">
                      <h4 className="hp-card-title">
                        {item.title || "About Property"}
                      </h4>

                      <div className="hp-card-meta">
                        <div>
                          <b>Location:</b> {item.location || "-"}
                        </div>
                        <div>
                          <b>Property ID:</b> {item.id}
                        </div>
                      </div>

                      <div className="hp-card-desc">
                        {(item.description || "This property is ...").slice(0, 110)}
                        {(item.description || "").length > 110 ? "..." : ""}
                      </div>

                      <div className="hp-card-actions">
                        <button
                          onClick={() => nav(`/listings/${item.id}`)}
                          className="hp-action-btn"
                        >
                          Details
                        </button>

                        <button
                          className={`hp-action-btn booking${
                            disabled ? " disabled" : ""
                          }`}
                          disabled={disabled}
                          onClick={() => handleBookingClick(item.id, booked)}
                        >
                          {btnLabel}
                        </button>

                        <button
                          onClick={() =>
                            has360
                              ? nav(`/listing/${item.id}/360`)
                              : nav(`/listings/${item.id}`)
                          }
                          className="hp-action-btn"
                        >
                          {has360 ? "360° Tour" : "Preview"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}