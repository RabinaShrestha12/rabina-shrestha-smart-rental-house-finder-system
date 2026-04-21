import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Send,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";

export default function OwnerRentalContractsPage() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const ui = {
    pageBg: isDark
      ? "bg-[linear-gradient(180deg,#071120_0%,#0a1a30_45%,#0c2240_100%)]"
      : "bg-[linear-gradient(180deg,#f6f8fc_0%,#eef3f9_100%)]",
    card: isDark
      ? "border border-white/10 bg-[#10294d]/95 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
      : "border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
    soft: isDark
      ? "border border-white/10 bg-[#0d223f]"
      : "border border-slate-200 bg-slate-50",
    input: isDark
      ? "bg-[#16345c] border-white/10 text-white placeholder:text-slate-400"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
    heading: isDark ? "text-white" : "text-slate-900",
    sub: isDark ? "text-slate-300" : "text-slate-600",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    action: isDark
      ? "border border-white/10 bg-[#0d223f] text-slate-200 hover:bg-[#16345c]"
      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
  };

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [contracts, setContracts] = useState([]);
  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    booking_id: "",
    contract_title: "",
  });

  const [form, setForm] = useState({
    contract_title: "",
    rent_amount: "",
    security_deposit: "",
    payment_due_day: 5,
    start_date: "",
    end_date: "",
    utility_terms: "",
    house_rules: "",
    special_terms: "",
  });

  const currentStatus = String(selected?.status || "").toLowerCase();

  // UPDATED: active contract is now editable in frontend
  const canEditContract = useMemo(() => {
    return ["draft", "pending_tenant", "active"].includes(currentStatus);
  }, [currentStatus]);

  const canSendContract = useMemo(() => {
    return currentStatus === "draft";
  }, [currentStatus]);

  const canFinalizeContract = useMemo(() => {
    return currentStatus === "pending_owner";
  }, [currentStatus]);

  const canDeleteContract = useMemo(() => {
    return !!selected?.id && currentStatus !== "active";
  }, [selected?.id, currentStatus]);

  const hasDates = useMemo(() => {
    return !!form.start_date && !!form.end_date;
  }, [form.start_date, form.end_date]);

  const existingBookingIds = useMemo(() => {
    return new Set(
      contracts.map((c) => c.booking).filter((v) => v !== null && v !== undefined)
    );
  }, [contracts]);

  const availableBookings = useMemo(() => {
    const acceptedStatuses = new Set(["accepted", "approved", "confirmed", "booked"]);

    return eligibleBookings.filter((b) => {
      const status = String(b.status || "").toLowerCase();
      return acceptedStatuses.has(status) && !existingBookingIds.has(b.id);
    });
  }, [eligibleBookings, existingBookingIds]);

  const statusBadge = (status) => {
    const s = String(status || "").toLowerCase();

    if (s === "active") {
      return isDark
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (s === "pending_tenant" || s === "pending_owner") {
      return isDark
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (s === "rejected") {
      return isDark
        ? "border-red-500/20 bg-red-500/10 text-red-300"
        : "border-red-200 bg-red-50 text-red-700";
    }

    return isDark
      ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
      : "border-blue-200 bg-blue-50 text-blue-700";
  };

  const parseApiError = (err, fallback) => {
    const data = err?.response?.data;

    if (!data) return fallback;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;

    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
      return data.non_field_errors[0];
    }

    const firstField = Object.keys(data)[0];
    if (firstField) {
      const value = data[firstField];
      if (Array.isArray(value) && value.length) return value[0];
      if (typeof value === "string") return value;
    }

    return fallback;
  };

  const applyContractDetail = (data) => {
    const contract = data || {};
    setSelected(contract);
    setForm({
      contract_title: contract.contract_title || "",
      rent_amount: contract.rent_amount ?? "",
      security_deposit: contract.security_deposit ?? "",
      payment_due_day: contract.payment_due_day ?? 5,
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      utility_terms: contract.utility_terms || "",
      house_rules: contract.house_rules || "",
      special_terms: contract.special_terms || "",
    });
  };

  const resetSelected = () => {
    setSelected(null);
    setForm({
      contract_title: "",
      rent_amount: "",
      security_deposit: "",
      payment_due_day: 5,
      start_date: "",
      end_date: "",
      utility_terms: "",
      house_rules: "",
      special_terms: "",
    });
  };

  const buildPayload = () => {
    const payload = {};

    const title = String(form.contract_title || "").trim();
    const utilityTerms = String(form.utility_terms || "").trim();
    const houseRules = String(form.house_rules || "").trim();
    const specialTerms = String(form.special_terms || "").trim();

    if (title) payload.contract_title = title;
    if (utilityTerms) payload.utility_terms = utilityTerms;
    if (houseRules) payload.house_rules = houseRules;
    if (specialTerms) payload.special_terms = specialTerms;

    if (form.rent_amount !== "" && form.rent_amount != null) {
      const rent = Number(form.rent_amount);
      if (!Number.isNaN(rent)) payload.rent_amount = rent;
    }

    if (form.security_deposit !== "" && form.security_deposit != null) {
      const deposit = Number(form.security_deposit);
      if (!Number.isNaN(deposit)) payload.security_deposit = deposit;
    }

    if (form.payment_due_day !== "" && form.payment_due_day != null) {
      const dueDay = Number(form.payment_due_day);
      if (!Number.isNaN(dueDay)) payload.payment_due_day = dueDay;
    }

    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;

    return payload;
  };

  const validateForm = ({ requireDates = false } = {}) => {
    if (form.payment_due_day !== "" && form.payment_due_day != null) {
      const paymentDueDay = Number(form.payment_due_day);

      if (
        Number.isNaN(paymentDueDay) ||
        paymentDueDay < 1 ||
        paymentDueDay > 31
      ) {
        return "Payment due day must be between 1 and 31.";
      }
    }

    if ((form.start_date && !form.end_date) || (!form.start_date && form.end_date)) {
      return "Please fill both start date and end date.";
    }

    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Please enter valid contract dates.";
      }

      if (end <= start) {
        return "End date must be after start date.";
      }
    }

    if (requireDates && (!form.start_date || !form.end_date)) {
      return "Please fill start date and end date before sending.";
    }

    return "";
  };

  const loadContracts = async () => {
    try {
      const res = await api.get("owner/contracts/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];
      setContracts(list);
      return list;
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to load rental contracts."),
      });
      setContracts([]);
      return [];
    }
  };

  const loadEligibleBookings = async () => {
    try {
      const res = await api.get("owner/booking-requests/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];
      setEligibleBookings(list);
    } catch (err) {
      setEligibleBookings([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadContracts(), loadEligibleBookings()]);
    } finally {
      setLoading(false);
    }
  };

  const loadContractDetail = async (id) => {
    try {
      const res = await api.get(`owner/contracts/${id}/`);
      applyContractDetail(res.data || {});
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to load contract details."),
      });
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const createContract = async () => {
    if (!createForm.booking_id) {
      setToast({ type: "error", msg: "Please select an accepted booking first." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        booking_id: Number(createForm.booking_id),
        contract_title: String(createForm.contract_title || "").trim(),
      };

      const res = await api.post("owner/contracts/", payload);
      const created = res.data || {};

      setToast({ type: "success", msg: "Contract created successfully." });
      setCreateForm({ booking_id: "", contract_title: "" });
      applyContractDetail(created);

      await loadContracts();
      await loadEligibleBookings();
    } catch (err) {
      console.log("CREATE contract error:", err?.response?.data);
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to create contract."),
      });
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async ({ silentSuccess = false } = {}) => {
    if (!selected?.id) return null;

    if (!canEditContract) {
      setToast({
        type: "error",
        msg: "This contract cannot be edited in its current status.",
      });
      return null;
    }

    const validationError = validateForm({ requireDates: false });
    if (validationError) {
      setToast({ type: "error", msg: validationError });
      return null;
    }

    const payload = buildPayload();

    if (Object.keys(payload).length === 0) {
      if (!silentSuccess) {
        setToast({ type: "info", msg: "No valid contract changes to save." });
      }
      return selected;
    }

    setSaving(true);
    try {
      const res = await api.patch(`owner/contracts/${selected.id}/`, payload);
      const data = res.data || {};
      applyContractDetail(data);

      if (!silentSuccess) {
        setToast({ type: "success", msg: "Contract updated successfully." });
      }

      await loadContracts();
      return data;
    } catch (err) {
      console.log("PATCH contract error:", err?.response?.data);
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to update contract."),
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const sendToTenant = async () => {
    if (!selected?.id) return;

    if (!canSendContract) {
      setToast({
        type: "error",
        msg: "Only draft contracts can be sent to the tenant.",
      });
      return;
    }

    const validationError = validateForm({ requireDates: true });
    if (validationError) {
      setToast({ type: "error", msg: validationError });
      return;
    }

    const saved = await saveDraft({ silentSuccess: true });
    if (!saved) return;

    setSaving(true);
    try {
      await api.post(`owner/contracts/${selected.id}/send/`);
      setToast({ type: "success", msg: "Contract sent to tenant successfully." });
      await loadContractDetail(selected.id);
      await loadContracts();
    } catch (err) {
      console.log("SEND contract error:", err?.response?.data);
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to send contract."),
      });
    } finally {
      setSaving(false);
    }
  };

  const finalizeContract = async () => {
    if (!selected?.id) return;

    if (!canFinalizeContract) {
      setToast({
        type: "error",
        msg: "Only contracts waiting for owner approval can be finalized.",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post(`owner/contracts/${selected.id}/finalize/`);
      setToast({ type: "success", msg: "Contract finalized successfully." });
      await loadContractDetail(selected.id);
      await loadContracts();
    } catch (err) {
      console.log("FINALIZE contract error:", err?.response?.data);
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to finalize contract."),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async () => {
    if (!selected?.id) return;

    if (!canDeleteContract) {
      setToast({
        type: "error",
        msg: "Active contracts cannot be deleted.",
      });
      return;
    }

    const ok = window.confirm("Are you sure you want to delete this contract?");
    if (!ok) return;

    setSaving(true);
    try {
      await api.delete(`owner/contracts/${selected.id}/`);
      setToast({ type: "success", msg: "Contract deleted successfully." });
      resetSelected();
      await loadContracts();
      await loadEligibleBookings();
    } catch (err) {
      console.log("DELETE contract error:", err?.response?.data);
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to delete contract."),
      });
    } finally {
      setSaving(false);
    }
  };

  const inputDisabled = saving || !canEditContract;

  return (
    <Shell>
      <div className={`min-h-screen ${ui.pageBg}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <div className={`rounded-[32px] p-6 lg:p-8 ${ui.card}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className={`text-3xl font-black tracking-tight ${ui.heading}`}>
                  Rental Contracts
                </h1>
                <p className={`mt-2 text-sm ${ui.sub}`}>
                  Create, view, update, send, finalize, and delete owner-tenant rental contracts.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => nav("/owner")}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.action}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>

                <button
                  onClick={loadAll}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.action}`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className={`rounded-[32px] p-6 ${ui.card}`}>
                <h2 className={`text-xl font-black ${ui.heading}`}>Create Contract</h2>
                <p className={`mt-1 text-sm ${ui.sub}`}>
                  Select an accepted booking and create a draft contract.
                </p>

                <div className="mt-4 grid gap-4">
                  <select
                    name="booking_id"
                    value={createForm.booking_id}
                    onChange={onCreateChange}
                    disabled={saving || availableBookings.length === 0}
                    className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                  >
                    <option value="">Select accepted booking</option>
                    {availableBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.tenant_name || "Tenant"} — {b.listing?.title || "Property"}
                      </option>
                    ))}
                  </select>

                  <input
                    name="contract_title"
                    value={createForm.contract_title}
                    onChange={onCreateChange}
                    disabled={saving}
                    placeholder="Optional contract title"
                    className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                  />

                  <button
                    onClick={createContract}
                    disabled={saving || !createForm.booking_id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Create Contract
                  </button>
                </div>

                {availableBookings.length === 0 ? (
                  <div className={`mt-4 rounded-2xl p-4 ${ui.soft}`}>
                    <p className={`text-sm ${ui.sub}`}>
                      No accepted booking is available for contract creation.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={`rounded-[32px] p-6 ${ui.card}`}>
                <h2 className={`text-xl font-black ${ui.heading}`}>All Contracts</h2>

                {loading ? (
                  <div className={`mt-4 rounded-2xl p-4 ${ui.soft}`}>
                    <p className={`text-sm ${ui.sub}`}>Loading contracts...</p>
                  </div>
                ) : contracts.length === 0 ? (
                  <div className={`mt-4 rounded-2xl p-4 ${ui.soft}`}>
                    <p className={`text-sm ${ui.sub}`}>
                      No rental contracts yet.
                    </p>

                    <div className="mt-4">
                      <button
                        onClick={() => nav("/owner/messages")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Go to Booking Requests
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {contracts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => loadContractDetail(c.id)}
                        className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${
                          isDark
                            ? "border-white/10 bg-[#0d223f] hover:bg-[#16345c]"
                            : "border-slate-200 bg-slate-50 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className={`text-sm font-black ${ui.heading}`}>
                              {c.contract_title || "Rental Contract"}
                            </div>
                            <div className={`mt-1 text-xs ${ui.sub}`}>
                              {c.listing_title || "Property"}
                            </div>
                            <div className={`mt-1 text-xs ${ui.muted}`}>
                              Tenant: {c.tenant_name || "Tenant"}
                            </div>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusBadge(
                              c.status
                            )}`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-[32px] p-6 ${ui.card}`}>
              {!selected ? (
                <div className={`rounded-2xl p-6 ${ui.soft}`}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isDark ? "bg-white/10" : "bg-slate-100"
                      }`}
                    >
                      <FileText className={`h-5 w-5 ${ui.muted}`} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black ${ui.heading}`}>
                        Select a contract
                      </h3>
                      <p className={`text-sm ${ui.sub}`}>
                        Open a contract from the left to edit, send, finalize, or delete it.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className={`text-2xl font-black ${ui.heading}`}>
                        {selected.contract_title || "Rental Contract"}
                      </h2>
                      <p className={`mt-1 text-sm ${ui.sub}`}>
                        {selected.listing_title || "Property"} • Tenant:{" "}
                        {selected.tenant_name || "Tenant"}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(
                        selected.status
                      )}`}
                    >
                      {selected.status}
                    </span>
                  </div>

                  {!canEditContract ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-slate-500/20 bg-slate-500/10 text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      This contract cannot be edited in <strong>{selected.status}</strong> status.
                    </div>
                  ) : null}

                  {canSendContract && !hasDates ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      Fill start date and end date before sending to tenant.
                    </div>
                  ) : null}

                  {currentStatus === "active" ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      This active contract is editable in the frontend now. Save will still require backend support for active updates.
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <input
                      name="contract_title"
                      value={form.contract_title}
                      onChange={onChange}
                      disabled={inputDisabled}
                      placeholder="Contract title"
                      className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="rent_amount"
                      value={form.rent_amount}
                      onChange={onChange}
                      disabled={inputDisabled}
                      placeholder="Monthly rent"
                      className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="security_deposit"
                      value={form.security_deposit}
                      onChange={onChange}
                      disabled={inputDisabled}
                      placeholder="Security deposit"
                      className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <input
                      type="number"
                      min="1"
                      max="31"
                      name="payment_due_day"
                      value={form.payment_due_day}
                      onChange={onChange}
                      disabled={inputDisabled}
                      placeholder="Payment due day"
                      className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <input
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={onChange}
                      disabled={inputDisabled}
                      className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <input
                      type="date"
                      name="end_date"
                      value={form.end_date}
                      onChange={onChange}
                      disabled={inputDisabled}
                      className={`h-12 rounded-2xl border px-4 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />
                  </div>

                  <div className="mt-4 grid gap-4">
                    <textarea
                      name="utility_terms"
                      value={form.utility_terms}
                      onChange={onChange}
                      disabled={inputDisabled}
                      rows={4}
                      placeholder="Utility terms"
                      className={`rounded-2xl border px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <textarea
                      name="house_rules"
                      value={form.house_rules}
                      onChange={onChange}
                      disabled={inputDisabled}
                      rows={5}
                      placeholder="House rules"
                      className={`rounded-2xl border px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />

                    <textarea
                      name="special_terms"
                      value={form.special_terms}
                      onChange={onChange}
                      disabled={inputDisabled}
                      rows={4}
                      placeholder="Special terms"
                      className={`rounded-2xl border px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${ui.input}`}
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => saveDraft()}
                      disabled={saving || !canEditContract}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Save Draft
                    </button>

                    <button
                      onClick={sendToTenant}
                      disabled={saving || !canSendContract || !hasDates}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      Send to Tenant
                    </button>

                    <button
                      onClick={finalizeContract}
                      disabled={saving || !canFinalizeContract}
                      className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Finalize
                    </button>

                    <button
                      onClick={deleteContract}
                      disabled={saving || !canDeleteContract}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>

                  {selected.generated_text ? (
                    <div className={`mt-8 rounded-3xl p-5 ${ui.soft}`}>
                      <h3 className={`text-lg font-black ${ui.heading}`}>
                        Generated Contract Preview
                      </h3>
                      <pre
                        className={`mt-4 whitespace-pre-wrap text-sm leading-7 ${ui.sub}`}
                      >
                        {selected.generated_text}
                      </pre>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {toast.msg ? <Toast type={toast.type} message={toast.msg} /> : null}
      </div>
    </Shell>
  );
}