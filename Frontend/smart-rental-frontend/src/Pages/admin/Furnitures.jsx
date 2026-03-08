import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import api from "../../api/axios";

const EMPTY_FORM = {
  name: "",
  category: "Sofa",
  furniture_type: "",
  color: "",
  width: 120,
  height: 120,
  is_active: true,
  image: null,
};

export default function Furnitures() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState("");

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  const loadFurniture = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("furniture/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];
      setItems(list);
    } catch (e) {
      setError(axiosErr(e, "Failed to load furniture."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFurniture();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setPreview("");
  };

  const categories = useMemo(() => {
    const base = ["all"];
    const set = new Set(items.map((x) => x.category).filter(Boolean));
    return [...base, ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();

    return items.filter((item) => {
      const matchCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const searchable = [
        item.name,
        item.category,
        item.furniture_type,
        item.color,
      ]
        .join(" ")
        .toLowerCase();

      const matchQuery = !query || searchable.includes(query);

      return matchCategory && matchQuery;
    });
  }, [items, q, categoryFilter]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (file) => {
    handleChange("image", file || null);

    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("category", form.category);
      fd.append("furniture_type", form.furniture_type);
      fd.append("color", form.color);
      fd.append("width", form.width);
      fd.append("height", form.height);
      fd.append("is_active", form.is_active);

      if (form.image) {
        fd.append("image", form.image);
      }

      await api.post("admin/furniture/create/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setToast("Furniture added successfully.");
      resetForm();
      loadFurniture();
    } catch (e2) {
      setError(axiosErr(e2, "Failed to create furniture."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      category: item.category || "Sofa",
      furniture_type: item.furniture_type || "",
      color: item.color || "",
      width: item.width || 120,
      height: item.height || 120,
      is_active: item.is_active ?? true,
      image: null,
    });
    setPreview(item.image_url || item.image || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;

    setSaving(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("category", form.category);
      fd.append("furniture_type", form.furniture_type);
      fd.append("color", form.color);
      fd.append("width", form.width);
      fd.append("height", form.height);
      fd.append("is_active", form.is_active);

      if (form.image) {
        fd.append("image", form.image);
      }

      await api.patch(`admin/furniture/${editingId}/update/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setToast("Furniture updated successfully.");
      resetForm();
      loadFurniture();
    } catch (e2) {
      setError(axiosErr(e2, "Failed to update furniture."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this furniture?");
    if (!ok) return;

    try {
      await api.delete(`admin/furniture/${id}/delete/`);
      setToast("Furniture deleted successfully.");
      if (editingId === id) resetForm();
      loadFurniture();
    } catch (e) {
      setError(axiosErr(e, "Failed to delete furniture."));
    }
  };

  return (
    <Shell
      title="Furniture Management"
      subtitle="Add furniture manually, upload images, and store them in the backend for all tenants."
      right={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => nav("/admin")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Back Admin
          </button>

          <button
            onClick={loadFurniture}
            className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15"
          >
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="text-xl font-bold text-white">
            {editingId ? "Edit Furniture" : "Add Furniture"}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            Upload actual furniture once, then all tenants can use it in virtual furniture.
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {toast && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {toast}
            </div>
          )}

          <form
            onSubmit={editingId ? handleUpdate : handleCreate}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Furniture Name
              </label>
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="L-Shape Sofa"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                >
                  <option value="Sofa">Sofa</option>
                  <option value="Bed">Bed</option>
                  <option value="Chair">Chair</option>
                  <option value="Table">Table</option>
                  <option value="Lamp">Lamp</option>
                  <option value="Plant">Plant</option>
                  <option value="Cabinet">Cabinet</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Type / Shape
                </label>
                <input
                  value={form.furniture_type}
                  onChange={(e) => handleChange("furniture_type", e.target.value)}
                  placeholder="L Shape / Single / Round"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Color
                </label>
                <input
                  value={form.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                  placeholder="Grey"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Width
                </label>
                <input
                  type="number"
                  value={form.width}
                  onChange={(e) => handleChange("width", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Height
                </label>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => handleChange("height", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Furniture Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:px-3 file:py-2 file:text-cyan-100"
                required={!editingId}
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <input
                id="is_active"
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
              <label htmlFor="is_active" className="text-sm text-slate-300">
                Active furniture
              </label>
            </div>

            {preview && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 text-sm font-medium text-slate-300">
                  Image Preview
                </div>
                <div className="flex h-48 items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-3">
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-60"
              >
                {saving
                  ? editingId
                    ? "Updating..."
                    : "Saving..."
                  : editingId
                  ? "Update Furniture"
                  : "Add Furniture"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xl font-bold text-white">Furniture List</div>
              <div className="mt-1 text-sm text-slate-400">
                All items here are shared and reusable for every tenant.
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              {filteredItems.length} furniture item{filteredItems.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search furniture..."
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Loading furniture...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              No furniture found.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07]"
                >
                  <div className="flex h-44 items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-3">
                    <img
                      src={item.image_url || item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="text-lg font-bold text-white">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.category} • {item.furniture_type || "—"} • {item.color || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.width} × {item.height}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          item.is_active
                            ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border border-red-400/20 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/15"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}