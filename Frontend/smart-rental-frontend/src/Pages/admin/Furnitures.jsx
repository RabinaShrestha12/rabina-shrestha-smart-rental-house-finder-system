import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import api from "../../api/axios";
import { 
  Plus, Edit, Trash2, Box, Image as ImageIcon, 
  RefreshCw, CheckCircle2, XCircle, Search, 
  ChevronRight, Filter, AlertCircle 
} from "lucide-react";

const FURNITURE_CATEGORIES = [
  "Sofa", "Bed", "Chair", "Table", "Lamp", "Cabinet", "Other",
];

const EMPTY_FORM = {
  name: "", category: "Sofa", furniture_type: "", color: "",
  width: 120, height: 120, is_active: true, image: null,
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

  const axiosErr = (e, fallback) => e?.response?.data?.detail || e?.response?.data?.message || fallback;

  const loadFurniture = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("furniture/");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.results) ? res.data.results : [];
      setItems(list);
    } catch (e) {
      setError(axiosErr(e, "Failed to load furniture catalog."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFurniture(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    return () => { if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview); };
  }, [preview]);

  const resetForm = () => {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setForm(EMPTY_FORM); setEditingId(null); setPreview("");
  };

  const categories = useMemo(() => {
    const existing = new Set(items.map((x) => x.category).filter(Boolean));
    FURNITURE_CATEGORIES.forEach((cat) => existing.add(cat));
    return ["all", ...FURNITURE_CATEGORIES, ...Array.from(existing).filter((cat) => !FURNITURE_CATEGORIES.includes(cat))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((item) => {
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      const searchable = [item.name, item.category, item.furniture_type, item.color].join(" ").toLowerCase();
      const matchQuery = !query || searchable.includes(query);
      return matchCategory && matchQuery;
    });
  }, [items, q, categoryFilter]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleImageChange = (file) => {
    handleChange("image", file || null);
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    if (!file) { setPreview(""); return; }
    setPreview(URL.createObjectURL(file));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'image') {
          if (value) fd.append(key, value);
        } else {
          fd.append(key, value);
        }
      });

      if (editingId) {
        await api.patch(`admin/furniture/${editingId}/update/`, fd);
        setToast("Furniture updated successfully");
      } else {
        await api.post("admin/furniture/create/", fd);
        setToast("Furniture added to catalog");
      }
      resetForm(); loadFurniture();
    } catch (e2) {
      setError(axiosErr(e2, `Failed to ${editingId ? 'update' : 'create'} item.`));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setEditingId(item.id);
    setForm({
      name: item.name || "", category: item.category || "Sofa",
      furniture_type: item.furniture_type || "", color: item.color || "",
      width: item.width || 120, height: item.height || 120,
      is_active: item.is_active ?? true, image: null,
    });
    setPreview(item.image_url || item.image || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this furniture item from the global catalog?")) return;
    try {
      await api.delete(`admin/furniture/${id}/delete/`);
      setToast("Item deleted successfully.");
      if (editingId === id) resetForm();
      loadFurniture();
    } catch (e) {
      setError(axiosErr(e, "Failed to delete item."));
    }
  };

  return (
    <Shell
      title="Virtual Furniture Catalog"
      subtitle="Manage global 3D furniture assets available for tenant room planning."
      right={(
        <button onClick={() => nav("/admin/dashboard")} className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl transition-all">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      )}
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[400px_1fr] gap-12">
        
        {/* Left Column: Form Editor */}
        <div className="space-y-6 lg:sticky top-8 self-start">
           <div className={`p-4 rounded-[24px] border flex items-center gap-3 text-sm font-bold shadow-sm transition-all ${
             toast ? "bg-emerald-50 border-emerald-100 text-emerald-600 opacity-100" :
             error ? "bg-red-50 border-red-100 text-red-600 opacity-100" : "opacity-0 invisible h-0 p-0 m-0 overflow-hidden"
           }`}>
              {toast && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {error && <AlertCircle className="w-5 h-5 shrink-0" />}
              {toast || error}
           </div>

           <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${editingId ? 'bg-amber-500' : 'bg-blue-600'}`}>
                    {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                 </div>
                 <h2 className="text-xl font-black text-neutral-900 tracking-tight">{editingId ? "Edit Item" : "New Item"}</h2>
              </div>

              <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Furniture Name</label>
                    <input required value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Modern L-Shape Sofa" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Category</label>
                      <select value={form.category} onChange={(e) => handleChange("category", e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none appearance-none">
                        {FURNITURE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Type Variant</label>
                      <input value={form.furniture_type} onChange={(e) => handleChange("furniture_type", e.target.value)} placeholder="L Shape / Round" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all" />
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Color</label>
                       <input value={form.color} onChange={(e) => handleChange("color", e.target.value)} placeholder="Grey" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Width (cm)</label>
                       <input type="number" required value={form.width} onChange={(e) => handleChange("width", e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Height (cm)</label>
                       <input type="number" required value={form.height} onChange={(e) => handleChange("height", e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none" />
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block ml-1">Asset Image (PNG preferred, transparent bg)</label>
                    <div className="relative group overflow-hidden">
                       <input type="file" required={!editingId} accept="image/*" onChange={(e) => handleImageChange(e.target.files?.[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                       <div className="w-full p-4 border-2 border-dashed border-neutral-200 rounded-[24px] bg-neutral-50 flex items-center justify-center gap-3 text-sm font-medium text-neutral-500 group-hover:bg-neutral-100 group-hover:border-blue-300 transition-colors">
                          <ImageIcon className="w-5 h-5 text-blue-500" /> Upload New Asset
                       </div>
                    </div>
                 </div>

                 {preview && (
                    <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-[28px] flex items-center justify-center">
                       <img src={preview} alt="preview" className="h-40 object-contain drop-shadow-xl" />
                    </div>
                 )}

                 <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)} className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                       <span className="text-sm font-bold text-neutral-700">Available to users</span>
                    </label>
                 </div>

                 <div className="grid grid-cols-[1fr_auto] gap-3 pt-4">
                    <button type="submit" disabled={saving} className={`py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 disabled:scale-100 ${editingId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' : 'bg-neutral-900 hover:bg-black text-white shadow-neutral-900/10'}`}>
                       {saving ? "Processing..." : (editingId ? "Update Asset" : "Publish Asset")}
                    </button>
                    {editingId && (
                       <button type="button" onClick={resetForm} className="px-6 rounded-[24px] border border-neutral-200 bg-white text-neutral-600 font-bold text-xs uppercase tracking-widest hover:bg-neutral-50 transition-all">
                          Cancel
                       </button>
                    )}
                 </div>
              </form>
           </div>
        </div>

        {/* Right Column: Catalog Grid */}
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search catalog..." className="w-full md:w-[280px] pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-[20px] text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none" />
                 </div>
                 <div className="relative group border border-neutral-200 rounded-[20px] bg-white hidden md:block">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="appearance-none pl-11 pr-10 py-3 bg-transparent text-sm font-medium focus:outline-none cursor-pointer">
                       {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Types' : c}</option>)}
                    </select>
                 </div>
              </div>
              <span className="px-4 py-2 bg-white border border-neutral-100 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                 {filteredItems.length} Assets
              </span>
           </div>

           {loading ? (
             <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-white rounded-[32px] border border-neutral-100 animate-pulse" />)}
             </div>
           ) : filteredItems.length === 0 ? (
             <div className="h-[400px] bg-neutral-50 rounded-[40px] border border-dashed border-neutral-200 flex flex-col items-center justify-center text-center p-12">
                <Box className="w-16 h-16 text-neutral-200 mb-4" />
                <h3 className="text-lg font-black text-neutral-400 uppercase tracking-widest">Catalog Empty</h3>
                <p className="text-neutral-500 font-medium text-sm mt-2 max-w-sm">No assets match your search criteria or the catalog is currently empty.</p>
             </div>
           ) : (
             <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-neutral-200/40 hover:border-blue-100 transition-all duration-300 overflow-hidden flex flex-col group">
                     {/* Preview Box */}
                     <div className="h-48 bg-neutral-50/50 flex items-center justify-center p-6 relative border-b border-neutral-50">
                        <img src={item.image_url || item.image} alt={item.name} className="max-h-full max-w-full object-contain filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute top-4 left-4">
                           <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${item.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-50 text-neutral-400 border-neutral-200'}`}>
                              {item.is_active ? 'Live' : 'Hidden'}
                           </span>
                        </div>
                     </div>
                     {/* Meta */}
                     <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                           <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{item.category}</div>
                           <h3 className="text-sm font-black text-neutral-900 leading-tight mb-2 line-clamp-1">{item.name}</h3>
                           <div className="flex gap-2">
                              <span className="px-2 py-0.5 bg-neutral-100 rounded text-[9px] font-bold text-neutral-500">{item.width}x{item.height}cm</span>
                              {item.color && <span className="px-2 py-0.5 bg-neutral-100 rounded text-[9px] font-bold text-neutral-500 capitalize">{item.color}</span>}
                           </div>
                        </div>
                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => startEdit(item)} className="py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all">
                              <Edit className="w-3.5 h-3.5" /> Edit
                           </button>
                           <button onClick={() => handleDelete(item.id)} className="py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-red-100 transition-all">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                           </button>
                        </div>
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
