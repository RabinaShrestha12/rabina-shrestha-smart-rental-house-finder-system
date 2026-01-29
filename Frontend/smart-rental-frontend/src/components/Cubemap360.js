import React, { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { CubemapAdapter } from "@photo-sphere-viewer/cubemap-adapter";
import "@photo-sphere-viewer/core/index.css";

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Failed to load: " + url));
    img.src = url;
  });
}

export default function Cubemap360({
  cubemap, // ✅ expect {front, back, left, right, up, down}
  width = "100%",
  height = "70vh",
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    const urls = {
      front: cubemap?.front,
      back: cubemap?.back,
      left: cubemap?.left,
      right: cubemap?.right,
      up: cubemap?.up,
      down: cubemap?.down,
    };

    const missing = Object.entries(urls)
      .filter(([_, v]) => !v)
      .map(([k]) => k);

    if (missing.length > 0) {
      setError(`Missing cubemap images: ${missing.join(", ")} (need all 6)`);
      return;
    }

    let cancelled = false;
    setError("");

    (async () => {
      try {
        await Promise.all([
          preload(urls.front),
          preload(urls.back),
          preload(urls.left),
          preload(urls.right),
          preload(urls.up),
          preload(urls.down),
        ]);

        if (cancelled) return;

        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        viewerRef.current = new Viewer({
          container: containerRef.current,
          crossOrigin: "anonymous",
          adapter: [CubemapAdapter, {}],
          panorama: {
            left: urls.left,
            front: urls.front,
            right: urls.right,
            back: urls.back,
            top: urls.up,
            bottom: urls.down,
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
  }, [cubemap]);

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
