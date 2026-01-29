import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Panorama360 from "../../components/Panorama360";
import Cubemap360 from "../../components/Cubemap360";

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
        console.log("LISTING:", res.data); // ✅ debug
      } catch (e) {
        console.error(e);
        alert("Failed to load 360 view");
        nav("/", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, nav]);

  if (loading) return <div style={{ padding: 20 }}>Loading 360...</div>;
  if (!listing) return null;

  const pano = listing.pano_url;

  const cube = listing.cubemap; // ✅ from serializer

  const hasCube =
    cube?.front && cube?.back && cube?.left && cube?.right && cube?.up && cube?.down;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => nav(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 0 }}>{listing.title}</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>{listing.location}</p>

      <div style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }}>
        {hasCube ? (
          <Cubemap360 cubemap={cube} width="100%" height="70vh" />
        ) : pano ? (
          <Panorama360 panoramaUrl={pano} />
        ) : (
          <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
            360 panorama not uploaded for this listing.
          </div>
        )}
      </div>
    </div>
  );
}
