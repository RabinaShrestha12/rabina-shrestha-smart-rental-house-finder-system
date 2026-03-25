// src/pages/owner/OwnerMaintenance.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

function getBackendBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  );
}

function buildFullMediaUrl(raw) {
  if (!raw) return "";

  const value = String(raw).trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${getBackendBaseUrl()}${value}`;
  }

  if (value.startsWith("media/")) {
    return `${getBackendBaseUrl()}/${value}`;
  }

  return `${getBackendBaseUrl()}/media/${value}`;
}

// ✅ backend returns ServiceProviderProfile.id as "id"
function getProviderId(p) {
  return p?.id ?? p?.pk ?? null;
}

function getProviderName(p) {
  return p?.username ?? p?.user?.username ?? "Service Provider";
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

function getMsgText(m) {
  return m?.text || m?.message || m?.body || m?.content || "";
}

function getMsgImage(m) {
  const raw =
    m?.image_url ||
    m?.image ||
    m?.picture ||
    m?.photo ||
    m?.file ||
    m?.attachment ||
    m?.media ||
    m?.media_url ||
    "";
  return buildFullMediaUrl(raw);
}

export default function OwnerMaintenance() {
  const { role } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState({ type: "info", msg: "" });

  // create request
  const [form, setForm] = useState({
    title: "",
    category: "plumbing",
    priority: "medium",
    listing_id: "",
    description: "",
  });
  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // requests
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requests, setRequests] = useState([]);

  // providers
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");
  const [providers, setProviders] = useState([]);

  // filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterArea, setFilterArea] = useState("");

  // select provider + active request
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeReq, setActiveReq] = useState(null);

  // chat
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // image chat
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // ✅ requirement: owner can chat ONLY after provider assigned
  const canChat = !!activeReq?.assigned_provider_id;

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return nav("/auth", { replace: true });
    if (role !== "owner") return nav("/unauthorized", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ✅ clear selected provider when changing requests (prevents wrong assign)
  useEffect(() => {
    setSelectedProvider(null);
    setChatText("");
    clearSelectedImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReq?.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ----------------------------
  // Load providers
  // GET /api/owner/providers/
  // ----------------------------
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

  // ----------------------------
  // Load my maintenance requests
  // GET /api/owner/maintenance/
  // ----------------------------
  const loadRequests = async (keepActiveId = null) => {
    setRequestsLoading(true);
    try {
      const res = await api.get("owner/maintenance/");
      const list = safeArr(res.data);
      setRequests(list);

      if (keepActiveId) {
        const found = list.find((x) => String(x?.id) === String(keepActiveId));
        setActiveReq(found || list[0] || null);
      } else {
        setActiveReq(list[0] || null);
      }
    } catch (e) {
      setToast({ type: "error", msg: axiosMsg(e, "Failed to load requests.") });
      setRequests([]);
      setActiveReq(null);
    } finally {
      setRequestsLoading(false);
    }
  };

  // ----------------------------
  // Load chat for active request
  // GET /api/owner/maintenance/<id>/messages/
  // ----------------------------
  const loadChat = async (reqId) => {
    if (!reqId) return;
    setChatLoading(true);
    try {
      const res = await api.get(`owner/maintenance/${reqId}/messages/`);
      setMessages(safeArr(res.data));
    } catch (e) {
      setMessages([]);
      setToast({ type: "error", msg: axiosMsg(e, "Failed to load chat.") });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeReq?.id) loadChat(activeReq.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReq?.id]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", msg: "Please choose a valid image file." });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ----------------------------
  // Create request
  // POST /api/owner/maintenance/create/
  // ----------------------------
  const submitRequest = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) return setToast({ type: "error", msg: "Title is required" });
    if (!form.description.trim()) return setToast({ type: "error", msg: "Description is required" });

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        listing_id: form.listing_id ? Number(form.listing_id) : null,
      };

      const res = await api.post("owner/maintenance/create/", payload);

      setToast({ type: "success", msg: "Request created ✅ Now assign provider and chat." });
      setForm({ title: "", category: "plumbing", priority: "medium", listing_id: "", description: "" });

      const newId = res?.data?.id;
      await loadRequests(newId);
    } catch (e2) {
      setToast({ type: "error", msg: axiosMsg(e2, "Failed to create request") });
    }
  };

  // ----------------------------
  // Assign provider
  // ----------------------------
  const assignProvider = async () => {
    if (!activeReq?.id) {
      setToast({ type: "error", msg: "Select a request first." });
      return;
    }

    if (!selectedProvider) {
      setToast({ type: "error", msg: "Please select a service provider." });
      return;
    }

    if (activeReq?.assigned_provider_id) {
      setToast({ type: "info", msg: "Provider already assigned to this request." });
      return;
    }

    const provider_profile_id = getProviderId(selectedProvider);
    if (!provider_profile_id) {
      setToast({ type: "error", msg: "Selected provider is invalid." });
      return;
    }

    try {
      await api.post(`owner/maintenance/${activeReq.id}/assign-provider/`, {
        provider_profile_id,
      });

      setToast({ type: "success", msg: "Provider assigned ✅ Chat is now enabled." });
      await loadRequests(activeReq.id);
      await loadChat(activeReq.id);
    } catch (e) {
      try {
        await api.patch(`owner/maintenance/${activeReq.id}/assign/`, {
          provider_profile_id,
        });
        setToast({ type: "success", msg: "Provider assigned ✅ Chat is now enabled." });
        await loadRequests(activeReq.id);
        await loadChat(activeReq.id);
      } catch (e2) {
        setToast({ type: "error", msg: axiosMsg(e2, "Failed to assign provider") });
      }
    }
  };

  // ----------------------------
  // Send chat message to provider
  // POST /api/owner/maintenance/<id>/messages/send/
  // multipart/form-data with text + image
  // ----------------------------
  const sendChat = async () => {
    if (!activeReq?.id) {
      setToast({ type: "error", msg: "Select a request first." });
      return;
    }

    if (!activeReq?.assigned_provider_id) {
      setToast({ type: "error", msg: "Please assign a provider first to start chat." });
      return;
    }

    if (!chatText.trim() && !selectedImage) {
      setToast({ type: "error", msg: "Write a message or choose an image first." });
      return;
    }

    setSendingChat(true);
    try {
      const formData = new FormData();
      formData.append("text", chatText.trim());
      formData.append("message", chatText.trim());

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      await api.post(`owner/maintenance/${activeReq.id}/messages/send/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setChatText("");
      clearSelectedImage();
      await loadChat(activeReq.id);
      await loadRequests(activeReq.id);
      setToast({ type: "success", msg: "Message sent ✅" });
    } catch (e) {
      setToast({ type: "error", msg: axiosMsg(e, "Failed to send message") });
    } finally {
      setSendingChat(false);
    }
  };

  // ----------------------------
  // Filters (frontend)
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
      return (!c || pc === c) && (!a || pa.includes(a));
    });
  }, [providers, filterCategory, filterArea]);

  return (
    <Shell title="Owner Maintenance" subtitle="Create a request, assign provider, and chat." right={null}>
      <Toast type={toast.type} message={toast.msg} onClose={() => setToast({ type: "info", msg: "" })} />

      <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-extrabold text-white">Maintenance Requests</div>
            <div className="mt-1 text-sm text-slate-300">Assign a service provider and message them.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadProviders();
                loadRequests(activeReq?.id || null);
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-lg font-semibold text-white">Create a request</div>

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

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-300 mb-1">Category</div>
                  <select
                    name="category"
                    value={form.category}
                    onChange={onChange}
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="internet">Internet/WiFi</option>
                    <option value="gas">Gas</option>
                    <option value="hvac">AC / Heating</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="painting">Painting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-slate-300 mb-1">Priority</div>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={onChange}
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-1">Listing ID (optional)</div>
                <input
                  name="listing_id"
                  value={form.listing_id}
                  onChange={onChange}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  placeholder="e.g., 12"
                />
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
                  {requests.map((r) => {
                    const active = String(activeReq?.id) === String(r?.id);
                    return (
                      <button
                        key={r?.id}
                        type="button"
                        onClick={() => setActiveReq(r)}
                        className={`text-left rounded-xl border p-3 transition ${
                          active ? "border-blue-500/40 bg-blue-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="text-sm font-semibold text-white">
                          #{r?.id} • {r?.title ?? "Request"}
                        </div>
                        <div className="mt-1 text-xs text-slate-300">
                          {String(r?.category || "other").replaceAll("_", " ")} • {r?.priority || "medium"} •{" "}
                          {r?.status || "open"}
                        </div>
                        <div className="mt-2 text-xs text-slate-200/90 line-clamp-2">{r?.description ?? "—"}</div>
                        <div className="mt-2 text-xs text-slate-400">
                          Assigned: {r?.assigned_provider_name || "Not assigned"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-lg font-semibold text-white">Service Providers</div>
            <div className="mt-1 text-xs text-slate-400">Select a provider and assign to active request.</div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-slate-300 mb-2">Filter</div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                >
                  <option value="">All categories</option>
                  {categories.filter(Boolean).map((c) => (
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
              <>
                <div className="mt-4 grid gap-3">
                  {filteredProviders.map((p) => {
                    const selected = String(getProviderId(selectedProvider)) === String(getProviderId(p));
                    return (
                      <button
                        key={getProviderId(p)}
                        type="button"
                        onClick={() => setSelectedProvider(p)}
                        className={`text-left rounded-2xl border p-4 transition ${
                          selected
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-white/10 bg-black/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="text-sm font-semibold text-white">{getProviderName(p)}</div>
                        <div className="mt-2 text-xs text-slate-300">
                          Email: {getProviderEmail(p) || "—"} <br />
                          Phone: {getProviderPhone(p) || "—"} <br />
                          Category: {String(getProviderCategory(p) || "other").replaceAll("_", " ")} <br />
                          Area: {getProviderArea(p) || "—"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={assignProvider}
                  disabled={!activeReq?.id || !!activeReq?.assigned_provider_id}
                  className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-60"
                >
                  {activeReq?.assigned_provider_id ? "Provider Already Assigned" : "Assign Selected Provider to Active Request"}
                </button>
              </>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-white">
                Chat {activeReq?.id ? `(Request #${activeReq.id})` : ""}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {canChat ? "You can chat with the assigned provider." : "⚠️ Please assign a provider first to start chat."}
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 min-h-[220px]">
                {chatLoading ? (
                  <div className="text-sm text-slate-300">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-300">No messages yet.</div>
                ) : (
                  <div className="grid gap-2">
                    {messages.map((m, idx) => {
                      const msgImage = getMsgImage(m);
                      const msgText = getMsgText(m);

                      return (
                        <div key={m?.id ?? idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-slate-200">
                              {m?.sender_username || m?.sender_email || "User"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {m?.created_at ? new Date(m.created_at).toLocaleString() : ""}
                            </div>
                          </div>

                          {msgImage ? (
                            <div className="mt-3">
                              <img
                                src={msgImage}
                                alt="chat upload"
                                className="max-w-[240px] rounded-2xl border border-white/10"
                                onError={(e) => {
                                  console.log("OwnerMaintenance image failed:", msgImage, m);
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : null}

                          {msgText ? (
                            <div className="mt-2 text-sm text-slate-100 whitespace-pre-wrap">{msgText}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <textarea
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  rows={3}
                  disabled={!canChat}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20 disabled:opacity-60"
                  placeholder={canChat ? "Write your message to provider..." : "Assign a provider to enable chat..."}
                />

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={!canChat}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canChat}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition disabled:opacity-60"
                  >
                    Choose Image
                  </button>

                  {selectedImage ? (
                    <span className="text-xs text-slate-200 break-all">{selectedImage.name}</span>
                  ) : (
                    <span className="text-xs text-slate-400">No image selected</span>
                  )}
                </div>

                {previewUrl ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs text-slate-300 mb-2">Image preview</div>
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="max-w-[180px] rounded-2xl border border-white/10"
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 hover:bg-red-500/15"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={sendChat}
                    disabled={sendingChat || !canChat}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition disabled:opacity-60"
                  >
                    {sendingChat ? "Sending…" : "Send Message"}
                  </button>

                  <button
                    type="button"
                    onClick={() => loadChat(activeReq?.id)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                  >
                    Reload Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-slate-400">Smart Rental • React + Django + JWT</div>
      </div>
    </Shell>
  );
}