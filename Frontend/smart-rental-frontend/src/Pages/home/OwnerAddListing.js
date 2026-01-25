import React, { useMemo, useState } from "react";
import api from "../../api/axios";

export default function OwnerAddListing360() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "room",
    price_per_week: "",
    location: "",
    electricity_bill: "",
    owner_contact_number: "",
    owner_contact_email: "",
  });

  // ✅ cover image (Listing.image)
  const [cover, setCover] = useState(null);

  // ✅ 360 images (match Django field names exactly)
  const [pano, setPano] = useState({
    pano_front: null,
    pano_back: null,
    pano_left: null,
    pano_right: null,
    pano_up: null,
    pano_down: null,
  });

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onPanoChange = (key, file) => {
    setPano((p) => ({ ...p, [key]: file || null }));
  };

  // ✅ previews (optional but helps you see selected images)
  const coverPreview = useMemo(
    () => (cover ? URL.createObjectURL(cover) : null),
    [cover]
  );

  const panoPreview = (file) => (file ? URL.createObjectURL(file) : null);

  const submit = async (e) => {
    e.preventDefault();

    try {
      const fd = new FormData();

      // text fields
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // ✅ cover image must be "image"
      if (cover) fd.append("image", cover);

      // ✅ 360 fields must match model field names exactly
      Object.entries(pano).forEach(([k, file]) => {
        if (file) fd.append(k, file);
      });

      // ✅ IMPORTANT: your axios baseURL already ends with /api
      // so do NOT write /api again
      await api.post("/owner/listings/create/", fd);

      alert("✅ Property posted successfully!");
    } catch (err) {
      console.log(err?.response?.data);
      alert("❌ Upload failed. Check console + backend logs.");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h2>Post a Property (with 360° photos)</h2>
      <p>Upload 1 cover image + optional 6 photos (front, back, left, right, up, down).</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input name="title" value={form.title} onChange={onChange} placeholder="Title" required />
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" rows={4} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <select name="property_type" value={form.property_type} onChange={onChange}>
            <option value="room">Room</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>

          <input name="location" value={form.location} onChange={onChange} placeholder="Location" required />

          <input name="price_per_week" value={form.price_per_week} onChange={onChange} type="number" placeholder="Price per week" required />
          <input name="electricity_bill" value={form.electricity_bill} onChange={onChange} placeholder="Electricity bill (optional)" />

          <input name="owner_contact_number" value={form.owner_contact_number} onChange={onChange} placeholder="Owner phone" />
          <input name="owner_contact_email" value={form.owner_contact_email} onChange={onChange} type="email" placeholder="Owner email" />
        </div>

        {/* ✅ COVER */}
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
          <b>Cover image (thumbnail)</b>
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} />
          </div>

          {/* preview */}
          {coverPreview && (
            <img
              src={coverPreview}
              alt="cover preview"
              style={{ marginTop: 10, width: 260, height: 160, objectFit: "cover", borderRadius: 10, border: "1px solid #ccc" }}
            />
          )}
        </div>

        {/* ✅ 360 */}
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
          <b>360° Photos (6 sides)</b>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
            {[
              ["pano_front", "Front"],
              ["pano_back", "Back"],
              ["pano_left", "Left"],
              ["pano_right", "Right"],
              ["pano_up", "Up"],
              ["pano_down", "Down"],
            ].map(([key, label]) => (
              <div key={key} style={{ border: "1px solid #eee", padding: 10, borderRadius: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPanoChange(key, e.target.files?.[0])}
                />

                {/* preview */}
                {pano[key] && (
                  <img
                    src={panoPreview(pano[key])}
                    alt={`${label} preview`}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      height: 110,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid #ccc",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" style={{ padding: 12, fontWeight: 700 }}>
          Post Property
        </button>
      </form>
    </div>
  );
}
