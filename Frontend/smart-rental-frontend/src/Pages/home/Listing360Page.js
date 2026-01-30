import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Cubemap360 from "../../components/Cubemap360";
import Panorama360 from "../../components/Panorama360";

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

  const pano = listing?.pano_url || null;
  const cube = listing?.cubemap || null;

  // Build faces even if incomplete (helps debugging)
  const faces = useMemo(() => {
    if (!cube) return null;

    return {
      pano_front: cube.front ?? cube.pano_front ?? cube.panoFront,
      pano_back: cube.back ?? cube.pano_back ?? cube.panoBack,
      pano_left: cube.left ?? cube.pano_left ?? cube.panoLeft,
      pano_right: cube.right ?? cube.pano_right ?? cube.panoRight,

      // accept up/down or top/bottom from backend
      pano_up: cube.up ?? cube.top ?? cube.pano_up ?? cube.pano_top,
      pano_down: cube.down ?? cube.bottom ?? cube.pano_down ?? cube.pano_bottom,
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

  const hasCube = missingFaces.length === 0;

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!listing) return null;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => nav(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 0 }}>{listing.title}</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>{listing.location}</p>

      <h3>All 6 images (Preview)</h3>
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

      <h3 style={{ marginTop: 18 }}>360 View</h3>
      <div style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }}>
        {/* Prefer Cubemap if complete. Otherwise fallback to Panorama if exists */}
        {hasCube ? (
          <Cubemap360 faces={faces} height="70vh" />
        ) : pano ? (
          <Panorama360 panoramaUrl={pano} height="70vh" />
        ) : (
          <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
            360 view not uploaded for this listing.
          </div>
        )}
      </div>

      <pre style={{ marginTop: 16, background: "#f7f7f7", padding: 10, borderRadius: 8 }}>
        {JSON.stringify(
          {
            pano_url: listing?.pano_url,
            cubemap: listing?.cubemap,
            built_faces: faces,
            missing_faces: missingFaces,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
