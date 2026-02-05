// src/pages/dashboard/OwnerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function OwnerDashboard() {
  const { role, email, logout } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });

  // profile (your backend owner_profile returns { owner: {...}, listings: [...] })
  const [profile, setProfile] = useState(null);

  // show/hide property form
  const [showAddProperty, setShowAddProperty] = useState(false);

  // booking requests inbox (acts like messages)
  const [msgCount, setMsgCount] = useState(0);
  const [requests, setRequests] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ---- PROPERTY FORM STATE ----
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "house",
    location: "",
    price_per_month: "",
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

  // =========================
  // ✅ VALIDATION HELPERS
  // =========================
  const isEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

  const isPhone = (v) =>
    /^[0-9+\-\s]{7,20}$/.test(String(v || "").trim());

  const isPositiveNumber = (v) => {
    const n = Number(v);
    return !Number.isNaN(n) && n > 0;
  };

  const missing360Sides = () => {
    const need = ["front", "back", "left", "right", "up", "down"];
    return need.filter((k) => !pano[k]);
  };

  const validation = useMemo(() => {
    const errors = [];

    if (!form.title.trim()) errors.push("Title is required.");
    if (!form.location.trim()) errors.push("Location is required.");

    if (!form.price_per_month || !isPositiveNumber(form.price_per_month)) {
      errors.push("Price per month must be a positive number.");
    }

    if (!form.owner_contact_number.trim())
      errors.push("Owner contact number is required.");
    else if (!isPhone(form.owner_contact_number))
      errors.push("Owner contact number looks invalid.");

    if (form.owner_contact_email && !isEmail(form.owner_contact_email))
      errors.push("Owner contact email looks invalid.");

    if (!coverImage) errors.push("Cover image is required.");

    const missing = missing360Sides();
    if (missing.length)
      errors.push(
        `All 6 photos for 360° view required. Missing: ${missing.join(", ")}`
      );

    const okImage = (f) => f && f.type && f.type.startsWith("image/");
    if (coverImage && !okImage(coverImage))
      errors.push("Cover image must be an image file.");

    Object.entries(pano).forEach(([k, f]) => {
      if (f && !okImage(f)) errors.push(`${k.toUpperCase()} must be an image file.`);
    });

    return { ok: errors.length === 0, errors };
  }, [form, coverImage, pano]);

  // =========================
  // ✅ LOAD PROFILE + INBOX
  // =========================
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
        // ✅ Your urls.py uses: path("owner-profile/", owner_profile)
        const res = await api.get("owner-profile/");

        // owner_profile_views returns { owner: {...}, listings: [...] }
        // but in some versions you might return owner fields directly
        const data = res.data || {};
        const ownerObj = data.owner || data; // supports both formats
        setProfile(ownerObj);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to load owner profile.";
        setToast({ type: "error", msg });
      }
    };

    const loadInbox = async () => {
      setLoadingMsgs(true);
      try {
        // ✅ Use booking inbox endpoint (NOT /owner/messages/)
        const res = await api.get("owner/booking-requests/");
        const list = res.data || [];
        const arr = Array.isArray(list) ? list : list.results || [];
        setRequests(arr);
        setMsgCount(Array.isArray(list) ? list.length : (list.count || arr.length));
      } catch (err) {
        setRequests([]);
        setMsgCount(0);
      } finally {
        setLoadingMsgs(false);
      }
    };

    loadProfile();
    loadInbox();
  }, [role, nav]);

  const handleLogout = () => {
    logout();
    nav("/auth", { replace: true });
  };

  // ---- FORM HANDLERS ----
  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onPanoChange = (side, file) =>
    setPano((s) => ({ ...s, [side]: file }));

  // =========================
  // ✅ SUBMIT PROPERTY
  // =========================
  const submitProperty = async (e) => {
    e.preventDefault();

    if (!validation.ok) {
      setToast({
        type: "error",
        msg: validation.errors[0] || "Please fix form errors.",
      });
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description || "");
    fd.append("property_type", form.property_type);
    fd.append("location", form.location.trim());
    fd.append("price_per_month", String(form.price_per_month));
    fd.append("electricity_bill", form.electricity_bill || "");
    fd.append("owner_contact_number", String(form.owner_contact_number).trim());
    fd.append("owner_contact_email", form.owner_contact_email || "");
    fd.append("image", coverImage);

    fd.append("pano_front", pano.front);
    fd.append("pano_back", pano.back);
    fd.append("pano_left", pano.left);
    fd.append("pano_right", pano.right);
    fd.append("pano_up", pano.up);
    fd.append("pano_down", pano.down);

    setPosting(true);
    try {
      await api.post("owner/listings/create/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setToast({
        type: "success",
        msg: "Property posted successfully! It will show on homepage.",
      });

      setForm({
        title: "",
        description: "",
        property_type: "house",
        location: "",
        price_per_month: "",
        electricity_bill: "",
        owner_contact_number: "",
        owner_contact_email: "",
      });

      setCoverImage(null);
      setPano({ front: null, back: null, left: null, right: null, up: null, down: null });
      setShowAddProperty(false);
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

  // =========================
  // ✅ TOP BUTTONS
  // =========================
  const TopButtons = (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => nav("/")}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
      >
        🏠 Home
      </button>

      <button
        onClick={() => nav("/owner/my-properties")}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
      >
        🏘️ My Property Details
      </button>

      <button
        onClick={() => setShowAddProperty((s) => !s)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
      >
        {showAddProperty ? "Close Add Property" : "➕ Add Property Details"}
      </button>

      <button
        onClick={() => nav("/owner/messages")}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition flex items-center gap-2"
        title="View booking requests + messages"
      >
        📩 Tenant Messages
        <span className="ml-1 rounded-full bg-blue-600/80 px-2 py-[2px] text-xs text-white">
          {loadingMsgs ? "..." : msgCount}
        </span>
      </button>

      <button
        onClick={handleLogout}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
      >
        Logout
      </button>
    </div>
  );

  // Helpers to show preview nicely
  const getTenantEmail = (b) => b?.tenant_email || b?.tenant?.email || "Tenant";
  const getListingTitle = (b) => b?.listing_title || b?.listing?.title || "Property";
  const getFirstMessage = (b) => b?.first_message || b?.message || b?.text || "";

  return (
    <Shell
      title="Owner Dashboard"
      subtitle={`Welcome ${email || "Owner"}. Manage your profile and properties.`}
      right={TopButtons}
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

      {/* ✅ QUICK INBOX PREVIEW */}
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-white">Latest Tenant Requests</h2>
          <button
            onClick={() => nav("/owner/messages")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            View All
          </button>
        </div>

        {loadingMsgs ? (
          <p className="mt-2 text-sm text-slate-300">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">No requests yet.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {requests.slice(0, 3).map((b, idx) => (
              <div key={b.id || idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white font-semibold">
                  {getListingTitle(b)} • #{b.id}
                </div>

                <div className="mt-1 text-sm text-slate-200">
                  {(getFirstMessage(b) || "").slice(0, 140)}
                  {(getFirstMessage(b) || "").length > 140 ? "..." : ""}
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  From: {getTenantEmail(b)} • Status: {b.status || "pending"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ ADD PROPERTY CARD */}
      {showAddProperty && (
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-lg font-semibold text-white">Post a Property (with 360° photos)</h2>
          <p className="mt-1 text-sm text-slate-300">
            Upload 1 cover image + 6 photos (front, back, left, right, up, down).
          </p>

          {!validation.ok && (
            <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">Please fix these requirements:</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-red-100/90 space-y-1">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

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
                name="price_per_month"
                type="number"
                placeholder="Price per month"
                value={form.price_per_month}
                onChange={onChange}
                required
              />

              <input
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                name="electricity_bill"
                placeholder="Electricity bill (optional)"
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
      )}
    </Shell>
  );
}
