// src/pages/home/Listing360Page.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Cubemap360 from "../../components/Cubemap360";
import Panorama360 from "../../components/Panorama360";

// ✅ Set your backend base (change if deployed)
const BACKEND = "http://127.0.0.1:8000";

// ✅ Make sure /media/... becomes http://127.0.0.1:8000/media/...
function toAbsUrl(value) {
  if (!value) return "";
  const s = String(value).trim();

  // already absolute
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // if backend returns "/media/http://..." (rare)
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }

  // normal media path
  if (s.startsWith("/")) return `${BACKEND}${s}`;

  // fallback
  return `${BACKEND}/${s}`;
}

function FacesGrid({ faces }) {
  const items = [
    ["Front", faces?.pano_front],
    ["Back", faces?.pano_back],
    ["Left", faces?.pano_left],
    ["Right", faces?.pano_right],
    ["Up/Top", faces?.pano_up],
    ["Down/Bottom", faces?.pano_down],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {items.map(([label, url]) => (
        <div
          key={label}
          style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}
        >
          <div style={{ padding: 8, fontWeight: 700 }}>{label}</div>

          {url ? (
            <img
              src={url}
              alt={label}
              style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div style={{ padding: 12, color: "red" }}>❌ Missing</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Listing360Page() {
  const { id } = useParams();
  const nav = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.get(`/public/listings/${id}/`);
        if (!alive) return;
        setListing(res.data);
        console.log("LISTING:", res.data);
      } catch (e) {
        console.error(e);
        alert("Failed to load 360 view");
        nav("/", { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, nav]);

  // ✅ Prefer ONE panorama image (after conversion)
  const pano = useMemo(() => toAbsUrl(listing?.pano_url || listing?.panorama_360), [listing]);

  // ✅ Cubemap fallback (6 faces)
  const cube = listing?.cubemap || listing?.cubemap_faces || null;

  const faces = useMemo(() => {
    if (!cube) return null;

    const f = {
      pano_front: cube.front ?? cube.pano_front ?? cube.panoFront,
      pano_back: cube.back ?? cube.pano_back ?? cube.panoBack,
      pano_left: cube.left ?? cube.pano_left ?? cube.panoLeft,
      pano_right: cube.right ?? cube.pano_right ?? cube.panoRight,
      pano_up: cube.up ?? cube.top ?? cube.pano_up ?? cube.pano_top,
      pano_down: cube.down ?? cube.bottom ?? cube.pano_down ?? cube.pano_bottom,
    };

    // ✅ Make them absolute URLs
    return {
      pano_front: toAbsUrl(f.pano_front),
      pano_back: toAbsUrl(f.pano_back),
      pano_left: toAbsUrl(f.pano_left),
      pano_right: toAbsUrl(f.pano_right),
      pano_up: toAbsUrl(f.pano_up),
      pano_down: toAbsUrl(f.pano_down),
    };
  }, [cube]);

  const missingFaces = useMemo(() => {
    if (!faces) return ["cubemap missing"];
    const missing = [];
    if (!faces.pano_front) missing.push("front");
    if (!faces.pano_back) missing.push("back");
    if (!faces.pano_left) missing.push("left");
    if (!faces.pano_right) missing.push("right");
    if (!faces.pano_up) missing.push("up/top");
    if (!faces.pano_down) missing.push("down/bottom");
    return missing;
  }, [faces]);

  const hasCube = faces && missingFaces.length === 0;

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!listing) return null;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => nav(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 0 }}>{listing.title}</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>{listing.location}</p>

      {/* ✅ 360 VIEW FIRST (because this page is for 360) */}
      <h3 style={{ marginTop: 18 }}>360 View</h3>
      <div style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }}>
        {/* ✅ Prefer Panorama if available (your “converted” single file) */}
        {pano ? (
          <Panorama360 panoramaUrl={pano} height="70vh" />
        ) : hasCube ? (
          <Cubemap360 faces={faces} height="70vh" />
        ) : (
          <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
            360 view not uploaded for this listing.
          </div>
        )}
      </div>

      {/* ✅ Preview faces only for debugging */}
      <h3 style={{ marginTop: 18 }}>360 Photos (6 sides) Preview</h3>
      {faces ? (
        <>
          <FacesGrid faces={faces} />
          {missingFaces.length > 0 && (
            <div style={{ marginTop: 10, color: "red", fontWeight: 700 }}>
              ❌ Cubemap incomplete — Missing: {missingFaces.join(", ")}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "red" }}>❌ Cubemap not found in API</div>
      )}
    </div>
  );
}
