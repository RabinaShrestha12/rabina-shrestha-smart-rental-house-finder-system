// src/components/LocationPicker.jsx
import React from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Focus Morang / Sunsari (Itahari area)
const BOUNDS = L.latLngBounds(L.latLng(26.45, 86.85), L.latLng(26.90, 87.45));
const DEFAULT_CENTER = [26.6636, 87.2747]; // Itahari

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      if (typeof onPick === "function") {
        onPick({ lat, lng });
      } else {
        console.error("LocationPicker error: onPick is not a function");
      }
    },
  });

  return null;
}

export default function LocationPicker({ picked, onPick, height = 320 }) {
  const center =
    picked?.lat && picked?.lng ? [picked.lat, picked.lng] : DEFAULT_CENTER;

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #e5e5e5",
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height, width: "100%" }}
        maxBounds={BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={11}
        maxZoom={18}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onPick={onPick} />

        {picked?.lat && picked?.lng ? (
          <Marker position={[picked.lat, picked.lng]} />
        ) : null}
      </MapContainer>
    </div>
  );
}