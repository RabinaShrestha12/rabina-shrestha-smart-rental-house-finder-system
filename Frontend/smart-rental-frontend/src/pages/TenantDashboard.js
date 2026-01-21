import React from "react";
import { useAuth } from "../auth/AuthContext";

export default function TenantDashboard() {
  const { email, logout } = useAuth();
  return (
    <div style={{ padding: 20 }}>
      <h2>Tenant Dashboard</h2>
      <p>Logged in as: {email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
