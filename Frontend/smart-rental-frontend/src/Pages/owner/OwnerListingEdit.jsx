import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

export default function OwnerListingEdit() {
  const { id } = useParams();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/owner/my-listings/${id}/`);
        const d = res.data || {};
        setForm({
          title: d.title || "",
          description: d.description || "",
          property_type: d.property_type || "house",
          location: d.location || "",
          price_per_month: d.price_per_month || "",
          electricity_bill: d.electricity_bill || "",
          owner_contact_number: d.owner_contact_number || "",
          owner_contact_email: d.owner_contact_email || "",
        });
      } catch {
        setToast({ type: "error", msg: "Failed to load property." });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/owner/my-listings/${id}/update/`, form);
      setToast({ type: "success", msg: "Updated successfully." });
      nav(`/owner/listing/${id}`);
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.detail || "Update failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      title="Edit Property"
      subtitle={`Listing ID: ${id}`}
      right={
        <button
          onClick={() => nav(`/owner/listing/${id}`)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
        >
          Back
        </button>
      }
    >
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      {loading ? (
        <p className="text-slate-300">Loading...</p>
      ) : (
        <form onSubmit={save} className="rounded-3xl border border-white/10 bg-black/20 p-6 grid gap-3">
          <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            name="title" value={form.title} onChange={onChange} placeholder="Title" />

          <textarea className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            name="description" value={form.description} onChange={onChange} rows={3} placeholder="Description" />

          <div className="grid md:grid-cols-2 gap-3">
            <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="property_type" value={form.property_type} onChange={onChange}>
              <option value="house">House</option>
              <option value="room">Room</option>
              <option value="apartment">Apartment</option>
            </select>

            <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="location" value={form.location} onChange={onChange} placeholder="Location" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="price_per_month" value={form.price_per_month} onChange={onChange} placeholder="Price per month" />
            <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="electricity_bill" value={form.electricity_bill} onChange={onChange} placeholder="Electricity bill" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="owner_contact_number" value={form.owner_contact_number} onChange={onChange} placeholder="Contact number" />
            <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              name="owner_contact_email" value={form.owner_contact_email} onChange={onChange} placeholder="Contact email" />
          </div>

          <button disabled={saving} className="mt-2 rounded-2xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 transition disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}
    </Shell>
  );
}
