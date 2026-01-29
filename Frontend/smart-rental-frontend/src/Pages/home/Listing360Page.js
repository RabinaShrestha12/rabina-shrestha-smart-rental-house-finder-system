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
    ["Up", faces?.pano_up],
    ["Down", faces?.pano_down],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {items.map(([label, url]) => (
        <div key={label} style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
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
    (async () => {
      try {
        const res = await api.get(`/public/listings/${id}/`);
        setListing(res.data);
        console.log("LISTING:", res.data);
      } catch (e) {
        console.error(e);
        alert("Failed to load 360 view");
        nav("/", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, nav]);

  const pano = listing?.pano_url || null;
  const cube = listing?.cubemap || null;

  const hasCube =
    !!(cube?.front && cube?.back && cube?.left && cube?.right && cube?.up && cube?.down);

  const faces = useMemo(() => {
    if (!hasCube) return null;
    return {
      pano_front: cube.front,
      pano_back: cube.back,
      pano_left: cube.left,
      pano_right: cube.right,
      pano_up: cube.up,
      pano_down: cube.down,
    };
  }, [hasCube, cube]);

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
      {faces ? <FacesGrid faces={faces} /> : <div style={{ color: "red" }}>❌ Cubemap not complete</div>}

      <h3 style={{ marginTop: 18 }}>360 View</h3>
      <div style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }}>
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

      <pre style={{ marginTop: 16, background: "#f7f7f7", padding: 10, borderRadius: 8 }}>
        {JSON.stringify({ pano_url: listing.pano_url, cubemap: listing.cubemap }, null, 2)}
      </pre>
    </div>
  );
}
