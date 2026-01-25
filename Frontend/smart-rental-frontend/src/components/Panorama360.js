import React, { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // ✅ important
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Failed to load: " + url));
    img.src = url;
  });
}

export default function Panorama360({ src, width = "100%", height = "70vh" }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current || !src) return;

    let cancelled = false;
    setError("");

    (async () => {
      try {
        await preload(src);
        if (cancelled) return;

        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        viewerRef.current = new Viewer({
          container: containerRef.current,
          crossOrigin: "anonymous", // ✅ important
          panorama: src,
          navbar: ["zoom", "fullscreen"],
          loadingTxt: "Loading...",
        });
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load panorama");
      }
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [src]);

  if (error) {
    return (
      <div style={{ padding: 12, border: "1px solid #f99", borderRadius: 10 }}>
        <b>360 viewer error:</b>
        <div style={{ marginTop: 8 }}>{error}</div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width, height }} />;
}
