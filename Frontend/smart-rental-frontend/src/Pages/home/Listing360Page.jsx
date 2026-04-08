import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Cubemap360 from "../../components/Cubemap360";
import Panorama360 from "../../components/Panorama360";
import { useTheme } from "../../components/ThemeContext";
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

function FacesGrid({ faces, isDark }) {
  const items = [
    ["Front", faces?.pano_front],
    ["Back", faces?.pano_back],
    ["Left", faces?.pano_left],
    ["Right", faces?.pano_right],
    ["Up/Top", faces?.pano_up],
    ["Down/Bottom", faces?.pano_down],
  ];

  const ui = {
    card: isDark ? "bg-[#10233f] border-white/5 shadow-black/20" : "bg-neutral-50 border-neutral-200 shadow-sm",
    header: isDark ? "bg-white/5 border-white/5 text-slate-300" : "bg-white border-b border-neutral-200 text-neutral-700",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {items.map(([label, url]) => (
        <div key={label} className={`border rounded-2xl overflow-hidden shadow-sm ${ui.card}`}>
          <div className={`px-4 py-2 text-sm font-bold flex items-center justify-between ${ui.header}`}>
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
            <div className={`w-full h-32 md:h-48 flex flex-col items-center justify-center gap-2 ${
              isDark ? "bg-red-500/5 text-red-400/50" : "bg-red-50/30 text-red-400"
            }`}>
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const ui = {
    bg: isDark ? "bg-[#071120]" : "bg-neutral-50",
    card: isDark ? "bg-[#0f2947] border border-white/10 shadow-2xl shadow-black/30" : "bg-white border border-neutral-100 shadow-xl shadow-neutral-900/5",
    text: isDark ? "text-white" : "text-neutral-900",
    subText: isDark ? "text-slate-400" : "text-neutral-500",
    btnPrimary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30 hover:shadow-lg hover:-translate-y-0.5",
  };

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
    <div className={`min-h-screen pt-32 pb-24 w-full flex justify-center items-center ${ui.bg}`}>
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-full border-4 ${isDark ? 'border-blue-900/50 border-t-blue-500' : 'border-blue-200 border-t-blue-600'} animate-spin`}></div>
        <div className={`${ui.subText} font-medium`}>Loading 360° environment...</div>
      </div>
    </div>
  );
  
  if (!listing) return null;

  return (
    <div className={`min-h-screen pt-32 pb-24 selection:bg-blue-600 selection:text-white transition-colors duration-500 ${ui.bg} ${ui.text}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 rounded-[24px] transition-all ${ui.card}`}>
          <div>
            <h2 className={`text-3xl font-extrabold tracking-tight flex items-center gap-2 ${ui.text}`}>
              <Layers className="w-8 h-8 text-blue-600" /> Virtual 360° Tour
            </h2>
            <p className={`text-sm font-medium mt-2 ${ui.subText}`}>
              {listing.title} <span className="text-slate-300 mx-2">•</span> {listing.location}
            </p>
          </div>
          <button 
            onClick={() => nav(-1)} 
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1 w-max ${ui.btnPrimary}`}
          >
            <ChevronLeft className="w-4 h-4" /> Exit 360 View
          </button>
        </div>

        {/* 360 VIEW SECTION */}
        <div className={`w-full h-[70vh] min-h-[500px] rounded-[32px] overflow-hidden border transition-all relative ${ui.card}`}>
          {pano ? (
            <Panorama360 panoramaUrl={pano} height="100%" />
          ) : hasCube ? (
            <Cubemap360 faces={faces} height="100%" />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-center ${
              isDark ? "bg-[#0b1b33] text-slate-500" : "bg-neutral-100 text-neutral-500"
            }`}>
              <ImageIcon className="w-16 h-16 opacity-30 mb-4" />
              <h3 className={`text-xl font-bold mb-2 ${ui.text}`}>360 View Unavailable</h3>
              <p>The 360 images for this specific property have not been fully uploaded yet.</p>
            </div>
          )}
        </div>

        {/* Faces debug preview if applicable */}
        {faces && (
          <div className={`mt-12 rounded-[32px] p-8 transition-all ${ui.card}`}>
             <h3 className={`text-2xl font-extrabold tracking-tight mb-6 flex items-center gap-2 ${ui.text}`}>
                Cubemap Source Images
             </h3>
             <FacesGrid faces={faces} isDark={isDark} />
             {missingFaces.length > 0 && (
                <div className={`mt-8 px-6 py-4 rounded-xl text-sm font-bold border flex items-center gap-3 ${
                  isDark ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-red-500/20" : "bg-red-100"}`}>❌</div>
                  Cubemap incomplete. Missing angles: {missingFaces.join(", ")}. Tour may not render optimally.
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
