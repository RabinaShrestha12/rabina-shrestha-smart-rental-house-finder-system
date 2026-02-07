// src/pages/owner/OwnerMaintenance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";

function safeArr(d) {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.results)) return d.results;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function axiosMsg(err, fallback) {
  const data = err?.response?.data;
  return data?.detail || data?.message || data?.error || err?.message || fallback;
}

// ✅ IMPORTANT: works even if backend forgets to send id
function getProviderId(p, idx = 0) {
  const id = p?.id ?? p?.provider_id ?? p?.pk ?? p?.user_id ?? p?.user?.id ?? null;
  if (id != null && id !== "") return String(id);

  const email = String(p?.email ?? p?.user?.email ?? "")
    .trim()
    .toLowerCase();
  if (email) return `email:${email}`;

  return `idx:${idx}`;
}

function getProviderName(p) {
  return p?.name ?? p?.username ?? p?.full_name ?? p?.company_name ?? "Service Provider";
}
function getProviderEmail(p) {
  return p?.email ?? p?.user?.email ?? "";
}
function getProviderPhone(p) {
  return p?.phone ?? p?.contact_number ?? p?.mobile ?? "";
}
function getProviderCategory(p) {
  return p?.category ?? p?.service_category ?? p?.service_type ?? p?.skill ?? "other";
}
function getProviderArea(p) {
  return p?.service_area ?? p?.area ?? p?.location ?? "";
}

export default function OwnerMaintenance() {
  const { role } = useAuth();
  const nav = useNavigate();

  const [toast, setToast] = useState({ type: "info", msg: "" });

  // left: create request form
  const [form, setForm] = useState({
    title: "",
    category: "plumbing",
    service_area: "",
    preferred_date: "",
    description: "",
  });
  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // requests list
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requests, setRequests] = useState([]);

  // right: providers list
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");
  const [providers, setProviders] = useState([]);

  // filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterArea, setFilterArea] = useState("");

  // ✅ selection
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedProviderObj, setSelectedProviderObj] = useState(null);

  // ✅ message modal
  const [openMsg, setOpenMsg] = useState(false);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return nav("/auth", { replace: true });
    if (role !== "owner") return nav("/unauthorized", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ----------------------------
  // Load providers
  // ----------------------------
  const loadProviders = async () => {
    setProvidersLoading(true);
    setProvidersError("");
    try {
      const endpoints = [
        "providers/",
        "providers",
        "owner/providers/",
        "owner/providers",
        "service-providers/",
        "service-providers",
      ];

      let data = null;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          data = showData(res?.data);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!data && lastErr) {
        setProvidersError(
          axiosMsg(lastErr, "Providers API not found. Create GET /api/providers/ to return providers.")
        );
        setProviders([]);
      } else {
        setProviders(safeArr(data));
      }
    } finally {
      setProvidersLoading(false);
    }
  };

  // small helper to keep consistent
  const showData = (d) => d;

  // ----------------------------
  // Load my requests (optional)
  // ----------------------------
  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const endpoints = ["owner/maintenance/", "owner/service-requests/", "maintenance/owner/"];
      let data = null;

      for (const ep of endpoints) {
        try {
          const res = await api.get(ep);
          data = res.data;
          break;
        } catch {}
      }

      setRequests(safeArr(data));
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Filter providers
  // ----------------------------
  const categories = useMemo(() => {
    const set = new Set();
    (providers || []).forEach((p) => set.add(String(getProviderCategory(p) || "other").toLowerCase()));
    return ["", ...Array.from(set).filter(Boolean).sort()];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const c = String(filterCategory || "").trim().toLowerCase();
    const a = String(filterArea || "").trim().toLowerCase();

    return (providers || []).filter((p) => {
      const pc = String(getProviderCategory(p) || "").toLowerCase();
      const pa = String(getProviderArea(p) || "").toLowerCase();

      const okC = !c || pc === c;
      const okA = !a || pa.includes(a);

      return okC && okA;
    });
  }, [providers, filterCategory, filterArea]);

  // ----------------------------
  // Select provider
  // ----------------------------
  const selectProvider = (p, idx) => {
    const pid = getProviderId(p, idx);
    setSelectedProviderId(pid);
    setSelectedProviderObj(p);
    setToast({ type: "success", msg: "Provider selected ✅" });
  };

  // ----------------------------
  // Create request
  // ----------------------------
  const submitRequest = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setToast({ type: "error", msg: "Title is required" });
      return;
    }
    if (!form.description.trim()) {
      setToast({ type: "error", msg: "Description is required" });
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      service_area: form.service_area,
      preferred_date: form.preferred_date || null,
      description: form.description.trim(),

      // ✅ optional provider selection
      provider: selectedProviderId || null,
      provider_id: selectedProviderId || null,
    };

    try {
      const endpoints = ["owner/maintenance/", "owner/service-requests/", "maintenance/owner/"];
      let ok = false;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          await api.post(ep, payload);
          ok = true;
          break;
        } catch (e2) {
          lastErr = e2;
        }
      }

      if (!ok) {
        setToast({ type: "error", msg: axiosMsg(lastErr, "Failed to create request") });
        return;
      }

      setToast({ type: "success", msg: "Request created ✅" });
      setForm({ title: "", category: "plumbing", service_area: "", preferred_date: "", description: "" });
      await loadRequests();
    } catch (e) {
      setToast({ type: "error", msg: axiosMsg(e, "Failed to create request") });
    }
  };

  // ----------------------------
  // Message modal
  // ----------------------------
  const openMessageBox = (p, idx) => {
    const pid = getProviderId(p, idx);
    setSelectedProviderId(pid);
    setSelectedProviderObj(p);
    setMsgTitle("");
    setMsgBody("");
    setOpenMsg(true);
  };

  const closeMessageBox = () => {
    setOpenMsg(false);
    setMsgTitle("");
    setMsgBody("");
  };

  const sendMessage = async () => {
    const p = selectedProviderObj;
    if (!p) {
      setToast({ type: "error", msg: "Select a provider first." });
      return;
    }

    const pid = selectedProviderId || getProviderId(p, 0);
    const body = String(msgBody || "").trim();
    const title = String(msgTitle || "").trim();

    if (!body) {
      setToast({ type: "error", msg: "Please write your message." });
      return;
    }

    setSendingMsg(true);
    try {
      const payload = {
        provider: pid,
        provider_id: pid,
        title: title || "Maintenance problem",
        message: body,
        text: body,
      };

      const endpoints = [
        "owner/provider-messages/",
        "owner/messages/provider/",
        "messages/send/",
        `providers/${pid}/message/`,
        `provider/${pid}/message/`,
      ];

      let ok = false;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          await api.post(ep, payload);
          ok = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!ok) {
        setToast({
          type: "error",
          msg: axiosMsg(
            lastErr,
            "Message API not found. Create POST /api/owner/provider-messages/ to store message."
          ),
        });
        return;
      }

      setToast({ type: "success", msg: "Message sent ✅ Provider will receive it in Inbox." });
      closeMessageBox();
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <Shell title="" subtitle="" right={null}>
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-extrabold text-white">Maintenance / Service Requests</div>
            <div className="mt-1 text-sm text-slate-300">
              Create requests and message service providers directly.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadProviders();
                loadRequests();
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => nav("/owner")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
            >
              Back
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* LEFT: create request */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-lg font-semibold text-white">Create a request</div>
            <div className="mt-1 text-xs text-slate-400">
              Use this when you need plumbing, electrician, cleaning, gas, pest control, etc.
            </div>

            <form onSubmit={submitRequest} className="mt-4 grid gap-3">
              <div>
                <div className="text-xs text-slate-300 mb-1">Title</div>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  placeholder="e.g., Kitchen sink leaking"
                />
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-1">Category</div>
                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrician">Electrician</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="gas">Gas</option>
                  <option value="hvac">AC / Heating</option>
                  <option value="pest_control">Pest Control</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="painting">Painting</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-1">Service Area (for provider matching)</div>
                <input
                  name="service_area"
                  value={form.service_area}
                  onChange={onChange}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  placeholder="e.g., Itahari"
                />
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-1">Preferred Date (optional)</div>
                <input
                  type="date"
                  name="preferred_date"
                  value={form.preferred_date}
                  onChange={onChange}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-1">Select Service Provider (optional)</div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                  {selectedProviderObj ? (
                    <>
                      <b className="text-white">{getProviderName(selectedProviderObj)}</b>
                      <span className="text-slate-400"> • {String(getProviderCategory(selectedProviderObj)).replaceAll("_", " ")}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Auto / Not selected</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-1">Description</div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={5}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  placeholder="Describe your issue clearly..."
                />
              </div>

              <button
                type="submit"
                className="mt-1 rounded-2xl bg-purple-600 px-4 py-3 text-white font-semibold hover:bg-purple-500 transition"
              >
                Create Request
              </button>
            </form>

            <div className="mt-6">
              <div className="text-sm font-semibold text-white">My requests</div>
              {requestsLoading ? (
                <div className="mt-2 text-sm text-slate-300">Loading...</div>
              ) : requests.length === 0 ? (
                <div className="mt-2 text-sm text-slate-400">No maintenance requests yet.</div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {requests.map((r, idx) => (
                    <div key={r?.id ?? idx} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-sm font-semibold text-white">{r?.title ?? "Request"}</div>
                      <div className="mt-1 text-xs text-slate-300">
                        {String(r?.category || "other").replaceAll("_", " ")} • {r?.service_area || "—"}
                      </div>
                      <div className="mt-2 text-xs text-slate-200/90 line-clamp-2">{r?.description ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: providers */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-lg font-semibold text-white">Service Providers</div>
                <div className="mt-1 text-xs text-slate-400">
                  Choose a provider and click Message to communicate.
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-slate-300 mb-2">Filter</div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                >
                  <option value="">All categories</option>
                  {categories
                    .filter((x) => x)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c.replaceAll("_", " ")}
                      </option>
                    ))}
                </select>

                <input
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  placeholder="Service area"
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="mt-3 text-xs text-slate-400">
                Providers: <b className="text-slate-100">{filteredProviders.length}</b>
              </div>
            </div>

            {providersError ? (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <div className="text-sm font-semibold text-red-200">Providers not loading</div>
                <div className="mt-1 text-sm text-red-100/90">{providersError}</div>
              </div>
            ) : providersLoading ? (
              <div className="mt-4 text-sm text-slate-300">Loading providers...</div>
            ) : filteredProviders.length === 0 ? (
              <div className="mt-4 text-sm text-slate-300">No providers found.</div>
            ) : (
              <div className="mt-4 grid gap-3">
                {filteredProviders.map((p, idx) => {
                  const pid = getProviderId(p, idx);
                  const selected = String(selectedProviderId) === String(pid);

                  return (
                    <div
                      key={pid}
                      className={`rounded-2xl border p-4 ${
                        selected ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-black/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{getProviderName(p)}</div>
                          <div className="mt-2 text-xs text-slate-300">
                            Email: {getProviderEmail(p) || "—"} <br />
                            Phone: {getProviderPhone(p) || "—"} <br />
                            Category: {String(getProviderCategory(p) || "other").replaceAll("_", " ")}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                            {getProviderArea(p) ? getProviderArea(p) : "Area not set"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {/* ✅ IMPORTANT: type="button" */}
                        <button
                          type="button"
                          onClick={() => selectProvider(p, idx)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition border ${
                            selected
                              ? "bg-emerald-600 text-white border-emerald-500/40"
                              : "bg-white/5 text-slate-100 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {selected ? "Selected ✅" : "Select for request"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openMessageBox(p, idx)}
                          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition"
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-slate-400">Smart Rental • React + Django + JWT</div>
      </div>

      {/* ✅ MESSAGE MODAL */}
      {openMsg && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[700px] rounded-3xl border border-white/10 bg-[#0b1020] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">Send message</div>
                <div className="mt-1 text-sm text-slate-300">
                  To: <span className="text-slate-100">{selectedProviderObj ? getProviderName(selectedProviderObj) : "Provider"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMessageBox}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
                placeholder="Title (optional) e.g., Water pipe leaking"
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />

              <textarea
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write your problem message here..."
                rows={6}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeMessageBox}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sendingMsg}
                  className="rounded-2xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-60"
                >
                  {sendingMsg ? "Sending..." : "Send Message"}
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Backend needed: <b>POST /api/owner/provider-messages/</b> and provider inbox <b>GET /api/provider/messages/</b>.
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
