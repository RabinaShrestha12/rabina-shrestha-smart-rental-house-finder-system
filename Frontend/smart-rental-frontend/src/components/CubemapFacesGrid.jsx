import React from "react";

export default function CubemapFacesGrid({ faces }) {
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
            <img src={url} alt={label} style={{ width: "100%", height: 160, objectFit: "cover" }} />
          ) : (
            <div style={{ padding: 12 }}>❌ Missing</div>
          )}
        </div>
      ))}
    </div>
  );
}
