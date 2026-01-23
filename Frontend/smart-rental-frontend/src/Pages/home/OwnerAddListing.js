import React, { useState } from "react";
import api from "../../api/axios";

export default function OwnerAddListing() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "room",
    price_per_week: "",
    location: "",
    owner_contact_number: "",
    owner_contact_email: "",
  });

  const [image, setImage] = useState(null);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append("image", image);

      await api.post("/api/owner/listings/create/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Listing added successfully!");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to add listing");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h2>Add Listing (Owner)</h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input name="title" value={form.title} onChange={onChange} placeholder="Title" required />
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" rows={4} />
        <select name="property_type" value={form.property_type} onChange={onChange}>
          <option value="room">Room</option>
          <option value="house">House</option>
          <option value="apartment">Apartment</option>
        </select>
        <input name="price_per_week" value={form.price_per_week} onChange={onChange} type="number" placeholder="Price per week" required />
        <input name="location" value={form.location} onChange={onChange} placeholder="Location" required />

        <input name="owner_contact_number" value={form.owner_contact_number} onChange={onChange} placeholder="Owner phone" />
        <input name="owner_contact_email" value={form.owner_contact_email} onChange={onChange} type="email" placeholder="Owner email" />

        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />

        <button type="submit">Upload Listing</button>
      </form>
    </div>
  );
}
