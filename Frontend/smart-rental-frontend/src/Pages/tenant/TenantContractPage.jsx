import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  RefreshCw,
  XCircle,
  CreditCard,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";

export default function TenantContractPage() {
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

  const getDefaultPaymentLabel = () => "Initial Contract Payment";

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [working, setWorking] = useState(false);
  const [paying, setPaying] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_month: getDefaultPaymentLabel(),
  });

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

  const selectedStatus = String(selected?.status || "").toLowerCase();

  const canAcceptOrReject = selectedStatus === "pending_tenant";

  const canPay = useMemo(() => {
    return (
      !!selected?.id &&
      !!selected?.listing &&
      !!selected?.tenant_signed &&
      selectedStatus === "pending_owner"
    );
  }, [selected, selectedStatus]);

  const isActive = selectedStatus === "active";

  const applyContractDetail = (data) => {
    const contract = data || null;
    setSelected(contract);

    if (contract) {
      setPaymentForm({
        amount: contract.rent_amount ?? "",
        payment_month: getDefaultPaymentLabel(),
      });
    }
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await api.get("tenant/contracts/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];
      setContracts(list);
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to load contracts."),
      });
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadContractDetail = async (id) => {
    try {
      const res = await api.get(`tenant/contracts/${id}/`);
      applyContractDetail(res.data || null);
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to load contract details."),
      });
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const respondToContract = async (id, action) => {
    setWorking(true);
    try {
      await api.post(`tenant/contracts/${id}/respond/`, { action });

      setToast({
        type: "success",
        msg:
          action === "accept"
            ? "Contract accepted successfully. You can now continue to payment."
            : "Contract rejected successfully.",
      });

      await loadContracts();
      await loadContractDetail(id);
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to respond to contract."),
      });
    } finally {
      setWorking(false);
    }
  };

  const submitEsewaForm = (paymentUrl, formFields) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = paymentUrl;
    form.style.display = "none";

    Object.entries(formFields || {}).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value ?? "";
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const proceedToPayment = async () => {
    if (!selected?.listing) {
      setToast({
        type: "error",
        msg: "Listing information is missing for this contract.",
      });
      return;
    }

    const amountNumber = Number(paymentForm.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setToast({
        type: "error",
        msg: "Please enter a valid payment amount.",
      });
      return;
    }

    setPaying(true);
    try {
      const res = await api.post("payments/esewa/initiate/", {
        listing_id: selected.listing,
        amount: amountNumber,
        payment_month: String(paymentForm.payment_month || "").trim(),
      });

      const paymentUrl = res?.data?.payment_url;
      const formFields = res?.data?.form_fields;

      if (!paymentUrl || !formFields) {
        setToast({
          type: "error",
          msg: "Payment gateway response is incomplete.",
        });
        return;
      }

      submitEsewaForm(paymentUrl, formFields);
    } catch (err) {
      setToast({
        type: "error",
        msg: parseApiError(err, "Failed to start payment."),
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <Shell>
      <div className={`min-h-screen ${ui.pageBg}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <div className={`rounded-[32px] p-6 lg:p-8 ${ui.card}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className={`text-3xl font-black tracking-tight ${ui.heading}`}>
                  My Rental Contracts
                </h1>
                <p className={`mt-2 text-sm ${ui.sub}`}>
                  View your agreement, accept it, and then continue to payment.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => nav("/tenant")}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.action}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>

                <button
                  onClick={loadContracts}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${ui.action}`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className={`rounded-[32px] p-6 ${ui.card}`}>
              <h2 className={`text-xl font-black ${ui.heading}`}>All Contracts</h2>

              {loading ? (
                <div className={`mt-4 rounded-2xl p-4 ${ui.soft}`}>
                  <p className={`text-sm ${ui.sub}`}>Loading contracts...</p>
                </div>
              ) : contracts.length === 0 ? (
                <div className={`mt-4 rounded-2xl p-4 ${ui.soft}`}>
                  <p className={`text-sm ${ui.sub}`}>No contracts available yet.</p>
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
                            Owner: {c.owner_name || "Owner"}
                          </div>
                        </div>

                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusBadge(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-[32px] p-6 ${ui.card}`}>
              {!selected ? (
                <div className={`rounded-2xl p-6 ${ui.soft}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
                      <FileText className={`h-5 w-5 ${ui.muted}`} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black ${ui.heading}`}>
                        Select a contract
                      </h3>
                      <p className={`text-sm ${ui.sub}`}>
                        Open a contract from the left to view the agreement details.
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
                        {selected.listing_title || "Property"} • Owner: {selected.owner_name || "Owner"}
                      </p>
                    </div>

                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(selected.status)}`}>
                      {selected.status}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>Monthly Rent</p>
                      <p className={`mt-2 text-base font-semibold ${ui.heading}`}>{selected.rent_amount}</p>
                    </div>

                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>Security Deposit</p>
                      <p className={`mt-2 text-base font-semibold ${ui.heading}`}>{selected.security_deposit}</p>
                    </div>

                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>Payment Due Day</p>
                      <p className={`mt-2 text-base font-semibold ${ui.heading}`}>{selected.payment_due_day}</p>
                    </div>

                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>Contract Dates</p>
                      <p className={`mt-2 text-base font-semibold ${ui.heading}`}>
                        {selected.start_date || "Not set"} to {selected.end_date || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>Utility Terms</p>
                      <p className={`mt-2 text-sm leading-7 ${ui.sub}`}>
                        {selected.utility_terms || "No utility terms provided."}
                      </p>
                    </div>

                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>House Rules</p>
                      <p className={`mt-2 text-sm leading-7 ${ui.sub}`}>
                        {selected.house_rules || "No house rules provided."}
                      </p>
                    </div>

                    <div className={`rounded-2xl p-4 ${ui.soft}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${ui.muted}`}>Special Terms</p>
                      <p className={`mt-2 text-sm leading-7 ${ui.sub}`}>
                        {selected.special_terms || "No special terms provided."}
                      </p>
                    </div>
                  </div>

                  {selected.generated_text ? (
                    <div className={`mt-6 rounded-3xl p-5 ${ui.soft}`}>
                      <h3 className={`text-lg font-black ${ui.heading}`}>Agreement Preview</h3>
                      <pre className={`mt-4 whitespace-pre-wrap text-sm leading-7 ${ui.sub}`}>
                        {selected.generated_text}
                      </pre>
                    </div>
                  ) : null}

                  {canAcceptOrReject ? (
                    <>
                      <div
                        className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                          isDark
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        Please read the agreement carefully. Payment will be available only after you accept this agreement.
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => respondToContract(selected.id, "accept")}
                          disabled={working}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept Agreement
                        </button>

                        <button
                          onClick={() => respondToContract(selected.id, "reject")}
                          disabled={working}
                          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Agreement
                        </button>
                      </div>
                    </>
                  ) : null}

                  {canPay ? (
                    <div className={`mt-6 rounded-3xl p-5 ${ui.soft}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
                          <CreditCard className={`h-5 w-5 ${ui.muted}`} />
                        </div>
                        <div>
                          <h3 className={`text-lg font-black ${ui.heading}`}>
                            Continue to Payment
                          </h3>
                          <p className={`text-sm ${ui.sub}`}>
                            You accepted the agreement. You can now pay the contract amount.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              amount: e.target.value,
                            }))
                          }
                          placeholder="Payment amount"
                          className={`h-12 rounded-2xl border px-4 outline-none ${ui.input}`}
                        />

                        <input
                          type="text"
                          value={paymentForm.payment_month}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              payment_month: e.target.value,
                            }))
                          }
                          placeholder="Payment label"
                          className={`h-12 rounded-2xl border px-4 outline-none ${ui.input}`}
                        />
                      </div>

                      <div className="mt-5">
                        <button
                          onClick={proceedToPayment}
                          disabled={paying}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          <CreditCard className="h-4 w-4" />
                          {paying ? "Processing..." : "Pay with eSewa"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isActive ? (
                    <div
                      className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      This agreement is active. The payment for this contract has already been completed.
                    </div>
                  ) : null}

                  {!canAcceptOrReject && !canPay && !isActive ? (
                    <div
                      className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                        isDark
                          ? "border-slate-500/20 bg-slate-500/10 text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {selectedStatus === "rejected"
                        ? "This agreement has been rejected, so payment is not available."
                        : "Payment will appear after you accept the agreement."}
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