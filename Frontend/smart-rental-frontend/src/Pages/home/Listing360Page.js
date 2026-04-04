// src/pages/home/Listing360Page.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Cubemap360 from "../../components/Cubemap360";
import Panorama360 from "../../components/Panorama360";
import { ChevronLeft, Layers, Image as ImageIcon } from "lucide-react";

const BACKEND = "http://127.0.0.1:8000";

function toAbsUrl(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }
  if (s.startsWith("/")) return `${BACKEND}${s}`;
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {items.map(([label, url]) => (
        <div
          key={label}
          className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50 shadow-sm"
        >
          <div className="px-4 py-2 bg-white border-b border-neutral-200 text-sm font-bold text-neutral-700 flex items-center justify-between">
            {label} 
          </div>

          {url ? (
            <img
              src={url}
              alt={label}
              className="w-full h-32 md:h-48 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-32 md:h-48 flex flex-col items-center justify-center text-red-400 gap-2 bg-red-50/30">
              <ImageIcon className="w-6 h-6 opacity-50"/>
              <span className="text-xs font-bold uppercase tracking-wider">Missing</span>
            </div>
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
      } catch (e) {
        console.error(e);
        nav("/", { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, nav]);

  const pano = useMemo(() => toAbsUrl(listing?.pano_url || listing?.panorama_360), [listing]);
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

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 pt-32 pb-24 text-neutral-900 w-full flex justify-center items-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        <div className="text-neutral-500 font-medium">Loading 360° environment...</div>
      </div>
    </div>
  );
  
  if (!listing) return null;

  return (
    <div className="min-h-screen bg-neutral-50 pt-32 pb-24 text-neutral-900 selection:bg-blue-600 selection:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-6 rounded-[24px] shadow-sm border border-neutral-100">
          <div>
            <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
              <Layers className="w-8 h-8 text-blue-600" /> Virtual 360° Tour
            </h2>
            <p className="text-sm font-medium text-neutral-500 mt-2">
              {listing.title} <span className="text-neutral-300 mx-2">•</span> {listing.location}
            </p>
          </div>
          <button onClick={() => nav(-1)} className="px-6 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 font-bold text-sm transition-colors flex items-center gap-1 shadow-sm w-max">
            <ChevronLeft className="w-4 h-4" /> Exit 360 View
          </button>
        </div>

        {/* 360 VIEW SECTION */}
        <div className="w-full h-[70vh] min-h-[500px] rounded-[32px] overflow-hidden shadow-2xl shadow-neutral-900/10 border border-neutral-200 bg-white relative">
          {pano ? (
            <Panorama360 panoramaUrl={pano} height="100%" />
          ) : hasCube ? (
            <Cubemap360 faces={faces} height="100%" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 p-8 text-center text-neutral-500">
              <ImageIcon className="w-16 h-16 text-neutral-300 mb-4" />
              <h3 className="text-xl font-bold text-neutral-900 mb-2">360 View Unavailable</h3>
              <p>The 360 images for this specific property have not been fully uploaded yet.</p>
            </div>
          )}
        </div>

        {/* Faces debug preview if applicable */}
        {faces && (
          <div className="mt-12 bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8">
             <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-6 flex items-center gap-2">
                Cubemap Source Images
             </h3>
             <FacesGrid faces={faces} />
             {missingFaces.length > 0 && (
               <div className="mt-8 bg-red-50 text-red-800 px-6 py-4 rounded-xl text-sm font-bold border border-red-200 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">❌</div>
                 Cubemap incomplete. Missing angles: {missingFaces.join(", ")}. Tour may not render optimally.
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
