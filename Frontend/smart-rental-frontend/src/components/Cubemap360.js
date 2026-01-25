import React, { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { CubemapAdapter } from "@photo-sphere-viewer/cubemap-adapter";
import "@photo-sphere-viewer/core/index.css";

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // ✅ important for WebGL
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Failed to load: " + url));
    img.src = url;
  });
}

export default function Cubemap360({
  front, back, left, right, up, down,
  width = "100%",
  height = "70vh",
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    const urls = { front, back, left, right, up, down };
    if (Object.values(urls).some((u) => !u)) return;

    let cancelled = false;
    setError("");

    (async () => {
      try {
        // ✅ Preload all 6 images. If any fails -> you will see which one.
        await Promise.all([
          preload(front),
          preload(back),
          preload(left),
          preload(right),
          preload(up),
          preload(down),
        ]);

        if (cancelled) return;

        // destroy old viewer
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        viewerRef.current = new Viewer({
          container: containerRef.current,

          // ✅ IMPORTANT: allow WebGL textures from backend domain
          crossOrigin: "anonymous",

          adapter: [CubemapAdapter, {}],
          panorama: {
            left,
            front,
            right,
            back,
            top: up,
            bottom: down,
          },
          navbar: ["zoom", "fullscreen"],
          loadingTxt: "Loading...",
        });
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load cubemap images");
      }
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [front, back, left, right, up, down]);

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
