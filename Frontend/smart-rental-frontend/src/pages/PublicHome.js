import React from "react";
import { useNavigate } from "react-router-dom";

export default function PublicHome() {
  const nav = useNavigate();

  return (
    <div style={{ padding: 20 }}>
      <h2>Smart Rental House Finder System</h2>
      <p>Welcome! You can browse public info. To search, add listings, or manage rentals, please login.</p>

      <button onClick={() => nav("/auth")} style={{ padding: "10px 14px" }}>
        Login / Register (Owner or Tenant)
      </button>

      <div style={{ marginTop: 18, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h4>Public Dashboard</h4>
        <ul>
          <li>View basic landing page</li>
          <li>See featured listings (if you add later)</li>
          <li>Learn about the system</li>
        </ul>
        <p style={{ color: "#666" }}>
          (Actions like add, save, message, post, manage require login.)
        </p>
      </div>
    </div>
  );
}
