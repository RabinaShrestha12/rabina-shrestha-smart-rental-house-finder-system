import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";
import { ArrowLeft, Save, Home } from "lucide-react";

export default function OwnerListingEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

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

  const pageCard = isDark
    ? "border border-blue-400/15 bg-gradient-to-br from-[#0f2947] via-[#12345c] to-[#0c223d] shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
    : "border border-blue-100 bg-gradient-to-br from-white via-[#f8fbff] to-[#eef6ff] shadow-[0_18px_50px_rgba(37,99,235,0.10)]";

  const fieldClass = isDark
    ? "w-full rounded-2xl border border-blue-300/10 bg-[#0b2038] px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-blue-400/40 focus:bg-[#0d2743] focus:ring-4 focus:ring-blue-500/10"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

  const labelClass = isDark
    ? "mb-2 block text-sm font-bold text-blue-100"
    : "mb-2 block text-sm font-bold text-slate-700";

  const helperText = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <Shell
      title="Edit Property"
      subtitle={`Listing ID: ${id}`}
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(`/owner/listing/${id}`)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-[#12345c] text-blue-100 hover:bg-[#163d6d]"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => nav("/owner")}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              isDark
                ? "border-blue-400/20 bg-blue-600 text-white hover:bg-blue-500"
                : "border-blue-200 bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      }
    >
      <Toast
        type={toast.type}
        message={toast.msg}
        onClose={() => setToast({ type: "info", msg: "" })}
      />

      {loading ? (
        <div
          className={`rounded-3xl p-8 text-sm font-medium ${
            isDark ? "bg-[#10243d] text-slate-300" : "bg-white text-slate-600"
          }`}
        >
          Loading...
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1200px]">
          <form onSubmit={save} className={`rounded-[32px] p-6 md:p-8 ${pageCard}`}>
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2
                  className={`text-2xl font-black tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Update Property Details
                </h2>
                <p className={`mt-1 text-sm ${helperText}`}>
                  Edit the information below and save your changes.
                </p>
              </div>

              <div
                className={`inline-flex rounded-2xl px-4 py-2 text-sm font-bold ${
                  isDark
                    ? "bg-blue-500/10 text-blue-200 border border-blue-400/10"
                    : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}
              >
                Listing #{id}
              </div>
            </div>

            <div className="grid gap-5">
              <div>
                <label className={labelClass}>Property Title</label>
                <input
                  className={fieldClass}
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="Enter property title"
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${fieldClass} min-h-[120px] resize-y`}
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={4}
                  placeholder="Write a short description about the property"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Property Type</label>
                  <select
                    className={fieldClass}
                    name="property_type"
                    value={form.property_type}
                    onChange={onChange}
                  >
                    <option value="house">House</option>
                    <option value="room">Room</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    className={fieldClass}
                    name="location"
                    value={form.location}
                    onChange={onChange}
                    placeholder="Enter location"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Price Per Month (Rs)</label>
                  <input
                    className={fieldClass}
                    name="price_per_month"
                    value={form.price_per_month}
                    onChange={onChange}
                    placeholder="Enter monthly price"
                  />
                </div>

                <div>
                  <label className={labelClass}>Electricity Bill</label>
                  <input
                    className={fieldClass}
                    name="electricity_bill"
                    value={form.electricity_bill}
                    onChange={onChange}
                    placeholder="Enter electricity bill"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Contact Number</label>
                  <input
                    className={fieldClass}
                    name="owner_contact_number"
                    value={form.owner_contact_number}
                    onChange={onChange}
                    placeholder="Enter contact number"
                  />
                </div>

                <div>
                  <label className={labelClass}>Contact Email</label>
                  <input
                    className={fieldClass}
                    name="owner_contact_email"
                    value={form.owner_contact_email}
                    onChange={onChange}
                    placeholder="Enter contact email"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={saving}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.30)] transition hover:scale-[1.01] hover:from-blue-500 hover:via-blue-500 hover:to-indigo-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Shell>
  );
}