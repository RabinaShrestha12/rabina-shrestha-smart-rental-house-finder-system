import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function OwnerDashboard() {
  const { role, email, logout } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [profile, setProfile] = useState(null);

  // ---- PROPERTY FORM STATE ----
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "house",
    location: "",
    price_per_week: "",
    electricity_bill: "",
    owner_contact_number: "",
    owner_contact_email: "",
  });

  // Cover + 360 files
  const [coverImage, setCoverImage] = useState(null);
  const [pano, setPano] = useState({
    front: null,
    back: null,
    left: null,
    right: null,
    up: null,
    down: null,
  });

  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "owner") {
      nav("/unauthorized", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await api.get("/owner-profile/");
        setProfile(res.data);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load owner profile.";
        setToast({ type: "error", msg });
      }
    };

    loadProfile();
  }, [role, nav]);

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  // ---- FORM HANDLERS ----
  const onChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const onPanoChange = (side, file) => {
    setPano((s) => ({ ...s, [side]: file }));
  };

  const missing360Sides = () => {
    const need = ["front", "back", "left", "right", "up", "down"];
    return need.filter((k) => !pano[k]);
  };

  // ---- SUBMIT PROPERTY ----
  const submitProperty = async (e) => {
    e.preventDefault();

    // Basic validations
    if (!form.title || !form.location || !form.price_per_week) {
      setToast({ type: "error", msg: "Please fill Title, Location, and Price." });
      return;
    }
    if (!form.owner_contact_number) {
      setToast({ type: "error", msg: "Please add your contact number." });
      return;
    }
    if (!coverImage) {
      setToast({ type: "error", msg: "Cover image is required." });
      return;
    }

    // require all 6 images for 360 view
    const missing = missing360Sides();
    if (missing.length) {
      setToast({
        type: "error",
        msg: `Please upload all 6 photos for 360° view. Missing: ${missing.join(", ")}`,
      });
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description || "");
    fd.append("property_type", form.property_type);
    fd.append("location", form.location);
    fd.append("price_per_week", String(form.price_per_week));
    fd.append("electricity_bill", form.electricity_bill || "");
    fd.append("owner_contact_number", form.owner_contact_number);
    fd.append("owner_contact_email", form.owner_contact_email || "");

    // main image
    fd.append("image", coverImage);

    // 360 images (your backend must accept these field names)
    fd.append("pano_front", pano.front);
    fd.append("pano_back", pano.back);
    fd.append("pano_left", pano.left);
    fd.append("pano_right", pano.right);
    fd.append("pano_up", pano.up);
    fd.append("pano_down", pano.down);

    setPosting(true);
    try {
      // ✅ IMPORTANT: change endpoint if your backend is different
      // Example endpoint based on your earlier Django urls:
      // /owner/listings/create/
      await api.post("/owner/listings/create/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setToast({ type: "success", msg: "Property posted successfully! It will show on homepage." });

      // reset form
      setForm({
        title: "",
        description: "",
        property_type: "house",
        location: "",
        price_per_week: "",
        electricity_bill: "",
        owner_contact_number: "",
        owner_contact_email: "",
      });
      setCoverImage(null);
      setPano({ front: null, back: null, left: null, right: null, up: null, down: null });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Failed to post property.";
      setToast({ type: "error", msg });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Shell
      title="Owner Dashboard"
      subtitle={`Welcome ${email || "Owner"}. Manage your profile and properties.`}
      right={
        <button
          onClick={handleLogout}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Logout
        </button>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      {/* PROFILE CARD */}
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white">My Profile</h2>

        {!profile ? (
          <p className="mt-2 text-sm text-slate-300">Loading...</p>
        ) : (
          <div className="mt-4 text-sm text-slate-200 grid gap-2">
            <div><b>Owner ID:</b> {profile.id ?? "-"}</div>
            <div><b>Username:</b> {profile.username ?? "-"}</div>
            <div><b>Email:</b> {profile.email ?? email ?? "-"}</div>
            <div><b>Phone:</b> {profile.phone ?? "-"}</div>
            <div><b>Address:</b> {profile.address ?? "-"}</div>
          </div>
        )}
      </div>

      {/* ADD PROPERTY CARD */}
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-white">Post a Property (with 360° photos)</h2>
        <p className="mt-1 text-sm text-slate-300">
          Upload 1 cover image + 6 photos (front, back, left, right, up, down).
        </p>

        <form onSubmit={submitProperty} className="mt-4 grid gap-3">
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            name="title"
            placeholder="Title (e.g., 2 Bedroom House near City)"
            value={form.title}
            onChange={onChange}
            required
          />

          <textarea
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={onChange}
            rows={3}
          />

          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="property_type"
              value={form.property_type}
              onChange={onChange}
            >
              <option value="house">House</option>
              <option value="room">Room</option>
              <option value="apartment">Apartment</option>
            </select>

            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="location"
              placeholder="Location (Suburb / City)"
              value={form.location}
              onChange={onChange}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="price_per_week"
              type="number"
              placeholder="Price per week"
              value={form.price_per_week}
              onChange={onChange}
              required
            />
            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="electricity_bill"
              placeholder="Electricity bill (e.g., $30/week or $120/month)"
              value={form.electricity_bill}
              onChange={onChange}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="owner_contact_number"
              placeholder="Contact number"
              value={form.owner_contact_number}
              onChange={onChange}
              required
            />
            <input
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="owner_contact_email"
              placeholder="Contact email (optional)"
              value={form.owner_contact_email}
              onChange={onChange}
            />
          </div>

          <div className="mt-2">
            <label className="text-sm text-slate-200">Cover image *</label>
            <input
              className="mt-1 block w-full text-slate-200"
              type="file"
              accept="image/*"
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
            />
          </div>

          <div className="mt-2">
            <h3 className="text-sm font-semibold text-slate-200">360° Photos (6 sides) *</h3>

            <div className="mt-2 grid md:grid-cols-3 gap-3">
              {["front", "back", "left", "right", "up", "down"].map((side) => (
                <div key={side} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-200 mb-2">{side.toUpperCase()}</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPanoChange(side, e.target.files?.[0] || null)}
                    className="block w-full text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={posting}
            className="mt-4 rounded-2xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 transition disabled:opacity-60"
          >
            {posting ? "Posting..." : "Post Property"}
          </button>
        </form>
      </div>
    </Shell>
  );
}
