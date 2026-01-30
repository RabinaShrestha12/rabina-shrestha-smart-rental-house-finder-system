import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function OwnerAddListing360() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "room",
    price_per_month: "",   // ✅ changed
    location: "",
    electricity_bill: "",
    owner_contact_number: "",
    owner_contact_email: "",
  });

  const [cover, setCover] = useState(null);

  const [pano, setPano] = useState({
    pano_front: null,
    pano_back: null,
    pano_left: null,
    pano_right: null,
    pano_up: null,
    pano_down: null,
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onPanoChange = (key, file) => {
    setPano((p) => ({ ...p, [key]: file || null }));
  };

  const coverPreview = useMemo(() => {
    if (!cover) return null;
    return URL.createObjectURL(cover);
  }, [cover]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const panoPreview = (file) => (file ? URL.createObjectURL(file) : null);

  const submit = async (e) => {
    e.preventDefault();

    try {
      if (!form.title.trim()) {
        alert("Title is required.");
        return;
      }
      if (!form.location.trim()) {
        alert("Location is required.");
        return;
      }

      // ✅ changed validation to month
      if (!form.price_per_month || Number(form.price_per_month) <= 0) {
        alert("Price per month must be a positive number.");
        return;
      }

      const fd = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) {
          fd.append(k, v);
        }
      });

      if (cover) fd.append("image", cover);

      Object.entries(pano).forEach(([k, file]) => {
        if (file) fd.append(k, file);
      });

      await api.post("/owner/listings/create/", fd);

      alert("✅ Property posted successfully!");
      nav("/", { replace: true });

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      console.log("RESPONSE DATA:", err?.response?.data);
      alert("❌ Upload failed. Check console + backend logs.");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h2>Post a Property (with 360° photos)</h2>
      <p>
        Upload 1 cover image + optional 6 photos (front, back, left, right, up,
        down).
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input
          name="title"
          value={form.title}
          onChange={onChange}
          placeholder="Title"
          required
        />

        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          placeholder="Description"
          rows={4}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <select
            name="property_type"
            value={form.property_type}
            onChange={onChange}
          >
            <option value="room">Room</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>

          <input
            name="location"
            value={form.location}
            onChange={onChange}
            placeholder="Location"
            required
          />

          {/* ✅ changed input to month */}
          <input
            name="price_per_month"
            value={form.price_per_month}
            onChange={onChange}
            type="number"
            placeholder="Price per month"
            required
            min="1"
          />

          <input
            name="electricity_bill"
            value={form.electricity_bill}
            onChange={onChange}
            placeholder="Electricity bill (optional)"
          />

          <input
            name="owner_contact_number"
            value={form.owner_contact_number}
            onChange={onChange}
            placeholder="Owner phone"
          />

          <input
            name="owner_contact_email"
            value={form.owner_contact_email}
            onChange={onChange}
            type="email"
            placeholder="Owner email"
          />
        </div>

        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
          <b>Cover image (thumbnail)</b>
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] || null)}
            />
          </div>

          {coverPreview && (
            <img
              src={coverPreview}
              alt="cover preview"
              style={{
                marginTop: 10,
                width: 260,
                height: 160,
                objectFit: "cover",
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            />
          )}
        </div>

        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
          <b>360° Photos (6 sides)</b>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            {[
              ["pano_front", "Front"],
              ["pano_back", "Back"],
              ["pano_left", "Left"],
              ["pano_right", "Right"],
              ["pano_up", "Up"],
              ["pano_down", "Down"],
            ].map(([key, label]) => (
              <div
                key={key}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  borderRadius: 10,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPanoChange(key, e.target.files?.[0])}
                />

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
                    onLoad={(e) => {
                      const src = e.currentTarget.src;
                      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
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
