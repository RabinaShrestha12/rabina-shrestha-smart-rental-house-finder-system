import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";
import {
  ArrowLeft,
  RefreshCw,
  Wrench,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";

function safeArr(d) {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.results)) return d.results;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function axiosMsg(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  return data?.detail || data?.message || data?.error || err?.message || fallback;
}

function getProviderId(p) {
  return p?.id ?? p?.pk ?? null;
}
function getProviderName(p) {
  return p?.username ?? p?.name ?? p?.user?.username ?? "Service Provider";
}
function getProviderEmail(p) {
  return p?.email ?? p?.user?.email ?? "";
}
function getProviderPhone(p) {
  return p?.phone ?? "";
}
function getProviderCategory(p) {
  return p?.category ?? "other";
}
function getProviderArea(p) {
  return p?.service_area ?? "";
}

function statusClasses(status, isDark) {
  const s = String(status || "").toLowerCase();

  if (s === "open") {
    return isDark
      ? "border border-amber-300/40 bg-amber-300/20 text-amber-50"
      : "border border-amber-200 bg-amber-50 text-amber-700";
  }
  if (s === "in_progress") {
    return isDark
      ? "border border-sky-300/40 bg-sky-300/20 text-sky-50"
      : "border border-sky-200 bg-sky-50 text-sky-700";
  }
  if (s === "resolved" || s === "completed") {
    return isDark
      ? "border border-emerald-300/40 bg-emerald-300/20 text-emerald-50"
      : "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "rejected" || s === "cancelled") {
    return isDark
      ? "border border-rose-300/40 bg-rose-300/20 text-rose-50"
      : "border border-rose-200 bg-rose-50 text-rose-700";
  }

  return isDark
    ? "border border-sky-200/35 bg-sky-200/20 text-sky-50"
    : "border border-slate-200 bg-slate-100 text-slate-700";
}

function normalizeReq(r) {
  if (!r) return null;
  return {
    ...r,
    id: r?.id,
    listing_id: r?.listing_id ?? r?.listing ?? "",
    assigned_provider_id:
      r?.assigned_provider_id ??
      r?.assigned_provider?.id ??
      r?.assigned_provider ??
      null,
    assigned_provider_name:
      r?.assigned_provider_name ??
      r?.assigned_provider?.username ??
      r?.provider_name ??
      "",
  };
}

const EMPTY_FORM = {
  title: "",
  category: "plumbing",
  priority: "medium",
  listing_id: "",
  description: "",
};

export default function OwnerMaintenance() {
  const { role } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });

  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editingReqId, setEditingReqId] = useState(null);
  const [savingRequest, setSavingRequest] = useState(false);
  const [deletingReqId, setDeletingReqId] = useState(null);

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeReq, setActiveReq] = useState(null);

  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterArea, setFilterArea] = useState("");

  const onChange = (e) =>
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return nav("/auth", { replace: true });
    if (role !== "owner") return nav("/unauthorized", { replace: true });
  }, [role, nav]);

  const resetRequestForm = () => {
    setForm(EMPTY_FORM);
    setIsEditingRequest(false);
    setEditingReqId(null);
  };

  const fillFormForEdit = (req) => {
    const item = normalizeReq(req);
    if (!item) return;

    setForm({
      title: item?.title || "",
      category: item?.category || "plumbing",
      priority: item?.priority || "medium",
      listing_id: item?.listing_id ?? "",
      description: item?.description || "",
    });

    setIsEditingRequest(true);
    setEditingReqId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadRequests = async (keepActiveId = null) => {
    setRequestsLoading(true);
    try {
      const res = await api.get("owner/maintenance/");
      const list = safeArr(res.data).map(normalizeReq);
      setRequests(list);

      setActiveReq((prev) => {
        const targetId = keepActiveId || prev?.id;
        if (targetId) {
          const found = list.find((x) => String(x?.id) === String(targetId));
          if (found) return found;
        }
        return list[0] || null;
      });
    } catch (e) {
      setToast({ type: "error", msg: axiosMsg(e, "Failed to load requests.") });
      setRequests([]);
      setActiveReq(null);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadProviders = async () => {
    setProvidersLoading(true);
    setProvidersError("");
    try {
      const res = await api.get("owner/providers/");
      setProviders(safeArr(res.data));
    } catch (e) {
      setProvidersError(axiosMsg(e, "Failed to load providers."));
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    loadProviders();
  }, []);

  useEffect(() => {
    setSelectedProvider(null);
  }, [activeReq?.id]);

  const submitRequest = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setToast({ type: "error", msg: "Title is required." });
      return;
    }

    if (!form.description.trim()) {
      setToast({ type: "error", msg: "Description is required." });
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      priority: form.priority,
      description: form.description.trim(),
      listing_id: form.listing_id ? Number(form.listing_id) : null,
    };

    setSavingRequest(true);
    try {
      if (isEditingRequest && editingReqId) {
        const res = await api.patch(`owner/maintenance/${editingReqId}/update/`, payload);

        setToast({
          type: "success",
          msg: "Maintenance request updated successfully.",
        });

        const updatedId = res?.data?.id || editingReqId;
        resetRequestForm();
        await loadRequests(updatedId);
      } else {
        const res = await api.post("owner/maintenance/create/", payload);

        setToast({
          type: "success",
          msg: "Maintenance request created successfully.",
        });

        const newId = res?.data?.id;
        resetRequestForm();
        await loadRequests(newId);
      }
    } catch (e2) {
      setToast({
        type: "error",
        msg: axiosMsg(
          e2,
          isEditingRequest ? "Failed to update request." : "Failed to create request."
        ),
      });
    } finally {
      setSavingRequest(false);
    }
  };

  const deleteRequest = async (reqId) => {
    if (!reqId) return;

    const ok = window.confirm("Are you sure you want to delete this maintenance request?");
    if (!ok) return;

    setDeletingReqId(reqId);
    try {
      await api.delete(`owner/maintenance/${reqId}/delete/`);

      setToast({
        type: "success",
        msg: "Maintenance request deleted successfully.",
      });

      if (String(editingReqId) === String(reqId)) {
        resetRequestForm();
      }

      const nextList = requests.filter((r) => String(r.id) !== String(reqId));
      setRequests(nextList);

      if (String(activeReq?.id) === String(reqId)) {
        setActiveReq(nextList[0] || null);
      }

      if (nextList.length > 0) {
        await loadRequests(nextList[0].id);
      } else {
        setActiveReq(null);
      }
    } catch (e) {
      setToast({
        type: "error",
        msg: axiosMsg(e, "Failed to delete request."),
      });
    } finally {
      setDeletingReqId(null);
    }
  };

  const assignProvider = async () => {
    if (!activeReq?.id) {
      setToast({ type: "error", msg: "Please select a request first." });
      return;
    }

    if (!selectedProvider) {
      setToast({ type: "error", msg: "Please select a provider." });
      return;
    }

    if (activeReq?.assigned_provider_id || activeReq?.assigned_provider_name) {
      setToast({ type: "info", msg: "Provider already assigned." });
      return;
    }

    const provider_profile_id = getProviderId(selectedProvider);
    if (!provider_profile_id) {
      setToast({ type: "error", msg: "Invalid provider selected." });
      return;
    }

    try {
      await api.patch(`owner/maintenance/${activeReq.id}/assign/`, {
        provider_profile_id,
      });

      setToast({
        type: "success",
        msg: "Provider assigned successfully.",
      });

      await loadRequests(activeReq.id);
    } catch (e) {
      setToast({
        type: "error",
        msg: axiosMsg(e, "Failed to assign provider."),
      });
    }
  };

  const categories = useMemo(() => {
    const set = new Set();
    (providers || []).forEach((p) =>
      set.add(String(getProviderCategory(p) || "other").toLowerCase())
    );
    return ["", ...Array.from(set).filter(Boolean).sort()];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const c = String(filterCategory || "").trim().toLowerCase();
    const a = String(filterArea || "").trim().toLowerCase();

    return (providers || []).filter((p) => {
      const pc = String(getProviderCategory(p) || "").toLowerCase();
      const pa = String(getProviderArea(p) || "").toLowerCase();
      return (!c || pc === c) && (!a || pa.includes(a));
    });
  }, [providers, filterCategory, filterArea]);

  const ui = {
    pageWrap: isDark
      ? "rounded-[28px] border border-sky-200/20 bg-gradient-to-br from-sky-400/20 via-blue-500/20 to-cyan-400/20 shadow-[0_20px_60px_rgba(14,165,233,0.18)] backdrop-blur-sm"
      : "rounded-[28px] border border-slate-200 bg-[#f7fbff] shadow-[0_18px_45px_rgba(15,23,42,0.08)]",

    card: isDark
      ? "rounded-[26px] border border-sky-200/20 bg-sky-300/10 p-5 backdrop-blur-md"
      : "rounded-[26px] border border-slate-200 bg-white p-5",

    softCard: isDark
      ? "rounded-[22px] border border-sky-200/20 bg-sky-200/10 p-4"
      : "rounded-[22px] border border-slate-200 bg-[#fbfdff] p-4",

    input: isDark
      ? "w-full rounded-[18px] border border-sky-200/20 bg-sky-100/10 px-4 py-3 text-sm text-white outline-none placeholder:text-sky-100/60 focus:border-sky-300/60"
      : "w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500",

    textarea: isDark
      ? "w-full rounded-[18px] border border-sky-200/20 bg-sky-100/10 px-4 py-3 text-sm text-white outline-none placeholder:text-sky-100/60 focus:border-sky-300/60"
      : "w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500",

    smallTitle: isDark
      ? "text-[18px] font-black text-white"
      : "text-[18px] font-black text-slate-900",

    text: isDark ? "text-sm text-sky-50/90" : "text-sm text-slate-600",

    label: isDark
      ? "mb-1.5 block text-xs font-semibold text-sky-50/95"
      : "mb-1.5 block text-xs font-semibold text-slate-700",

    ghostBtn: isDark
      ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/30 bg-sky-100/15 px-4 py-2.5 text-sm font-medium text-sky-50 transition hover:bg-sky-100/25"
      : "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50",

    primaryBtn:
      "inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70",

    successBtn:
      "inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70",

    requestSelected: isDark
      ? "border-sky-200/50 bg-gradient-to-r from-sky-200/25 via-blue-200/25 to-cyan-200/25 shadow-[0_8px_24px_rgba(56,189,248,0.18)]"
      : "border-[#c4b5fd] bg-[#f5f0ff] shadow-[0_8px_22px_rgba(139,92,246,0.10)]",

    requestNormal: isDark
      ? "border-sky-200/35 bg-gradient-to-r from-sky-100/20 via-blue-100/20 to-cyan-100/20 hover:from-sky-100/30 hover:via-blue-100/30 hover:to-cyan-100/30"
      : "border-slate-200 bg-[#fcfaff] hover:bg-[#f7f2ff]",

    requestInnerButton: isDark
      ? "w-full rounded-[18px] px-4 py-4 text-left transition bg-sky-100/20 hover:bg-sky-100/30 border border-sky-200/20"
      : "w-full rounded-[18px] px-4 py-4 text-left transition bg-sky-50 hover:bg-sky-100 border border-sky-100",

    badge: isDark
      ? "inline-flex items-center rounded-full border border-sky-200/30 bg-sky-50 px-3 py-1 text-[11px] font-medium text-slate-800"
      : "inline-flex items-center rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1 text-[11px] font-medium text-slate-700",

    requestTitle: isDark
      ? "text-[16px] font-black text-sky-50"
      : "text-[16px] font-black text-slate-900",

    requestDesc: isDark
      ? "mt-3 text-sm text-sky-50"
      : "mt-3 text-sm text-slate-700",
  };

  return (
    <Shell
      title="Owner Maintenance"
      subtitle="Create, update, delete, and assign providers."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={ui.ghostBtn}
            onClick={() => nav("/owner")}
            type="button"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

          <button
            className={ui.ghostBtn}
            onClick={() => {
              loadRequests(activeReq?.id || null);
              loadProviders();
            }}
            type="button"
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
      }
    >
      <div className={ui.pageWrap}>
        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.95fr]">
          <div className="space-y-5">
            <section className={ui.card}>
              <h2 className={ui.smallTitle}>
                {isEditingRequest ? "Edit Request" : "Create New Request"}
              </h2>

              <p className={`${ui.text} mb-5`}>
                Report the issue clearly so the right provider can handle it faster.
              </p>

              <form className="space-y-4" onSubmit={submitRequest}>
                <div>
                  <label className={ui.label}>Title</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    placeholder="e.g. Kitchen sink leaking"
                    className={ui.input}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={ui.label}>Category</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={onChange}
                      className={ui.input}
                    >
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="internet">Internet</option>
                      <option value="gas">Gas</option>
                      <option value="hvac">HVAC</option>
                      <option value="pest_control">Pest Control</option>
                      <option value="carpentry">Carpentry</option>
                      <option value="painting">Painting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className={ui.label}>Priority</label>
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={onChange}
                      className={ui.input}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={ui.label}>Listing ID (optional)</label>
                  <input
                    name="listing_id"
                    value={form.listing_id}
                    onChange={onChange}
                    placeholder="e.g. 12"
                    className={ui.input}
                  />
                </div>

                <div>
                  <label className={ui.label}>Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    rows={5}
                    placeholder="Describe the issue clearly..."
                    className={ui.textarea}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={savingRequest}
                    className={ui.primaryBtn}
                  >
                    {isEditingRequest ? <Save size={16} /> : <Wrench size={16} />}
                    {savingRequest
                      ? isEditingRequest
                        ? "Updating..."
                        : "Creating..."
                      : isEditingRequest
                      ? "Update Request"
                      : "Create Request"}
                  </button>

                  {isEditingRequest ? (
                    <button
                      type="button"
                      onClick={resetRequestForm}
                      className={ui.ghostBtn}
                    >
                      <X size={16} />
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className={ui.card}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className={ui.smallTitle}>My Requests</h2>
                  <p className={ui.text}>
                    Select a request to assign provider and open its chat.
                  </p>
                </div>

                <span className={ui.badge}>{requests.length} total</span>
              </div>

              <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2">
                {requestsLoading ? (
                  <div className={ui.softCard}>
                    <p className={ui.text}>Loading requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className={ui.softCard}>
                    <p className={ui.text}>No maintenance requests yet.</p>
                  </div>
                ) : (
                  requests.map((req) => {
                    const isActive = String(activeReq?.id) === String(req?.id);
                    const isDeleting = String(deletingReqId) === String(req?.id);

                    return (
                      <div
                        key={req.id}
                        className={`rounded-[22px] border p-4 transition ${
                          isActive ? ui.requestSelected : ui.requestNormal
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveReq(req)}
                          className={ui.requestInnerButton}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className={ui.requestTitle}>
                                #{req.id} · {req.title || "Untitled"}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={ui.badge}>{req.category || "other"}</span>

                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${statusClasses(
                                    req.status,
                                    isDark
                                  )}`}
                                >
                                  {String(req.status || "").replaceAll("_", " ")}
                                </span>

                                <span
                                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                                    isDark ? "text-amber-200" : "text-amber-600"
                                  }`}
                                >
                                  {req.priority || "medium"}
                                </span>
                              </div>

                              <p className={ui.requestDesc}>
                                {req.description || "No description"}
                              </p>
                            </div>

                            <div className="shrink-0">
                              <span className={ui.badge}>
                                {req.assigned_provider_name
                                  ? `Assigned: ${req.assigned_provider_name}`
                                  : "Not assigned"}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => fillFormForEdit(req)}
                            className={ui.ghostBtn}
                          >
                            <Pencil size={15} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteRequest(req.id)}
                            disabled={isDeleting}
                            className={ui.ghostBtn}
                          >
                            <Trash2 size={15} />
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveReq(req)}
                            className={ui.ghostBtn}
                          >
                            <CheckCircle2 size={15} />
                            Select
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div>
            <section className={ui.card}>
              <h2 className={ui.smallTitle}>Providers</h2>
              <p className={`${ui.text} mb-4`}>
                Choose a provider for the currently selected request.
              </p>

              <div className={`${ui.softCard} mb-4 space-y-3`}>
                <div>
                  <label className={ui.label}>Filter Providers</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={ui.input}
                  >
                    <option value="">All categories</option>
                    {categories.filter(Boolean).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    placeholder="Filter by area"
                    className={ui.input}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {providersLoading ? (
                  <div className={ui.softCard}>
                    <p className={ui.text}>Loading providers...</p>
                  </div>
                ) : providersError ? (
                  <div className={ui.softCard}>
                    <p className={isDark ? "text-sm text-rose-100" : "text-sm text-rose-600"}>
                      {providersError}
                    </p>
                  </div>
                ) : filteredProviders.length === 0 ? (
                  <div className={ui.softCard}>
                    <p className={ui.text}>No providers found.</p>
                  </div>
                ) : (
                  filteredProviders.map((p) => {
                    const selected =
                      String(getProviderId(selectedProvider)) === String(getProviderId(p));

                    return (
                      <button
                        key={getProviderId(p)}
                        type="button"
                        onClick={() => setSelectedProvider(p)}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          selected
                            ? isDark
                              ? "border-emerald-300/40 bg-emerald-300/15"
                              : "border-emerald-300 bg-emerald-50"
                            : isDark
                            ? "border-sky-200/30 bg-sky-100/15 hover:bg-sky-100/25"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className={ui.requestTitle}>{getProviderName(p)}</div>

                        <div
                          className={`mt-3 space-y-1 text-sm ${
                            isDark ? "text-sky-50/90" : "text-slate-600"
                          }`}
                        >
                          <p>Email: {getProviderEmail(p) || "—"}</p>
                          <p>Phone: {getProviderPhone(p) || "—"}</p>
                          <p>Category: {getProviderCategory(p) || "other"}</p>
                          <p>Area: {getProviderArea(p) || "—"}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={assignProvider}
                  disabled={!activeReq || !selectedProvider || !!activeReq?.assigned_provider_name}
                  className={ui.successBtn}
                >
                  <CheckCircle2 size={16} />
                  {activeReq?.assigned_provider_name
                    ? "Provider Already Assigned"
                    : "Assign Provider"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {toast?.msg ? (
        <Toast
          type={toast.type || "info"}
          message={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />
      ) : null}
    </Shell>
  );
}