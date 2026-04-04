import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useTheme } from "../../components/ThemeContext";
import {
  ArrowLeft,
  CreditCard,
  RefreshCw,
  LayoutDashboard,
  Search,
  Wallet,
  CheckCircle2,
  Clock3,
  BadgeDollarSign,
} from "lucide-react";

export default function OwnerBookingPayments() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchPayments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const res = await api.get("/owner/booking-payments/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];

      setPayments(list);
    } catch (err) {
      console.error("Failed to load owner booking payments:", err);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getStatus = (p) =>
    String(p?.payment_status || p?.status || "PENDING").toUpperCase();

  const getPayoutStatus = (p) =>
    String(p?.owner_payout_status || p?.payout_status || "PENDING").toUpperCase();

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "Rs 0";
    const num = Number(value);
    if (Number.isNaN(num)) return `Rs ${value}`;
    return `Rs ${num.toLocaleString()}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  };

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;

    return payments.filter((p) => {
      const text = `
        ${p?.tenant_name || ""}
        ${p?.listing_title || ""}
        ${p?.amount || ""}
        ${p?.owner_share_amount || ""}
        ${p?.payment_status || ""}
        ${p?.owner_payout_status || ""}
        ${p?.owner_payout_note || ""}
        ${p?.id || ""}
      `
        .toLowerCase()
        .replace(/\s+/g, " ");

      return text.includes(q);
    });
  }, [payments, search]);

  const stats = useMemo(() => {
    const totalRecords = payments.length;

    const totalAmount = payments.reduce(
      (sum, p) => sum + (Number(p?.owner_share_amount) || 0),
      0
    );

    const completedCount = payments.filter(
      (p) => getStatus(p) === "COMPLETE"
    ).length;

    const pendingCount = payments.filter(
      (p) => getStatus(p) === "PENDING"
    ).length;

    return {
      totalRecords,
      totalAmount,
      completedCount,
      pendingCount,
    };
  }, [payments]);

  const paymentBadgeClass = (status) => {
    if (status === "COMPLETE") {
      return isDark
        ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
        : "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "PENDING") {
      return isDark
        ? "border border-amber-400/30 bg-amber-500/10 text-amber-300"
        : "border border-amber-200 bg-amber-50 text-amber-700";
    }
    if (status === "REJECTED" || status === "FAILED") {
      return isDark
        ? "border border-red-400/30 bg-red-500/10 text-red-300"
        : "border border-red-200 bg-red-50 text-red-700";
    }
    return isDark
      ? "border border-slate-400/20 bg-slate-500/10 text-slate-300"
      : "border border-slate-200 bg-slate-50 text-slate-700";
  };

  const payoutBadgeClass = (status) => {
    if (status === "PAID" || status === "COMPLETE") {
      return isDark
        ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
        : "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "PENDING" || status === "NOT_PAID") {
      return isDark
        ? "border border-violet-400/30 bg-violet-500/10 text-violet-300"
        : "border border-violet-200 bg-violet-50 text-violet-700";
    }
    return isDark
      ? "border border-slate-400/20 bg-slate-500/10 text-slate-300"
      : "border border-slate-200 bg-slate-50 text-slate-700";
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen px-6 pt-32 pb-10 xl:px-8 xl:pt-36 ${
          isDark ? "bg-[#0b2340]" : "bg-slate-100"
        }`}
      >
        <div className="mx-auto max-w-[1500px]">
          <div
            className={`rounded-[28px] border p-8 shadow-sm ${
              isDark
                ? "border-blue-400/15 bg-[#0f2947]"
                : "border-slate-200 bg-white"
            }`}
          >
            <h1
              className={`text-3xl font-black ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Loading owner booking payments...
            </h1>
            <p
              className={`mt-3 text-sm ${
                isDark ? "text-blue-200/70" : "text-slate-500"
              }`}
            >
              Please wait while payment records are being fetched.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen px-6 pt-32 pb-10 xl:px-8 xl:pt-36 ${
        isDark ? "bg-[#0b2340]" : "bg-slate-100"
      }`}
    >
      <div className="mx-auto max-w-[1500px]">
        <div
          className={`rounded-[30px] border p-7 shadow-sm ${
            isDark
              ? "border-blue-400/15 bg-[#0f2947]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block h-10 w-1 rounded-full ${
                    isDark ? "bg-blue-400" : "bg-blue-600"
                  }`}
                />
                <h1
                  className={`text-3xl font-black tracking-tight xl:text-4xl ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Owner Payment Dashboard
                </h1>
              </div>
              <p
                className={`mt-4 max-w-3xl text-base ${
                  isDark ? "text-blue-200/75" : "text-slate-600"
                }`}
              >
                Track all tenant booking payments, owner payout details, payment
                status, and records in one clean desktop-ready dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fetchPayments(true)}
                disabled={refreshing}
                className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  isDark
                    ? "border-blue-400/15 bg-[#12345c] text-blue-100 hover:bg-[#163d6d]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => nav("/owner")}
                className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition ${
                  isDark
                    ? "border-blue-400/15 bg-[#12345c] text-blue-100 hover:bg-[#163d6d]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={() => nav("/owner")}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition ${
                  isDark
                    ? "bg-[#3f7fd1] hover:bg-[#4b8de0]"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div
            className={`rounded-[28px] border p-6 shadow-sm ${
              isDark
                ? "border-blue-400/20 bg-[#12345c]"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-sm font-bold ${
                    isDark ? "text-blue-200" : "text-blue-700"
                  }`}
                >
                  Total Payment Records
                </p>
                <h2
                  className={`mt-3 text-4xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {stats.totalRecords}
                </h2>
              </div>
              <div
                className={`rounded-2xl p-3 ${
                  isDark
                    ? "bg-[#1d4e85] text-blue-100"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div
            className={`rounded-[28px] border p-6 shadow-sm ${
              isDark
                ? "border-emerald-400/20 bg-[#113b47]"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-sm font-bold ${
                    isDark ? "text-emerald-200" : "text-emerald-700"
                  }`}
                >
                  Total Owner Share
                </p>
                <h2
                  className={`mt-3 text-4xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {formatMoney(stats.totalAmount)}
                </h2>
              </div>
              <div
                className={`rounded-2xl p-3 ${
                  isDark
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div
            className={`rounded-[28px] border p-6 shadow-sm ${
              isDark
                ? "border-violet-400/20 bg-[#2b2450]"
                : "border-violet-200 bg-violet-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-sm font-bold ${
                    isDark ? "text-violet-200" : "text-violet-700"
                  }`}
                >
                  Completed Payments
                </p>
                <h2
                  className={`mt-3 text-4xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {stats.completedCount}
                </h2>
              </div>
              <div
                className={`rounded-2xl p-3 ${
                  isDark
                    ? "bg-violet-500/15 text-violet-200"
                    : "bg-violet-100 text-violet-600"
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div
            className={`rounded-[28px] border p-6 shadow-sm ${
              isDark
                ? "border-amber-400/20 bg-[#4b3518]"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-sm font-bold ${
                    isDark ? "text-amber-200" : "text-amber-700"
                  }`}
                >
                  Pending Payments
                </p>
                <h2
                  className={`mt-3 text-4xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {stats.pendingCount}
                </h2>
              </div>
              <div
                className={`rounded-2xl p-3 ${
                  isDark
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mt-7 rounded-[30px] border p-6 shadow-sm ${
            isDark
              ? "border-blue-400/15 bg-[#0f2947]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2
              className={`text-2xl font-black ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Payment Details
            </h2>

            <div className="relative w-full xl:w-[430px]">
              <Search
                className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isDark ? "text-blue-200/60" : "text-slate-400"
                }`}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tenant, listing, amount, status..."
                className={`h-12 w-full rounded-2xl border pl-11 pr-4 text-sm outline-none transition ${
                  isDark
                    ? "border-blue-400/15 bg-[#12345c] text-white placeholder:text-blue-200/45 focus:border-blue-400"
                    : "border-slate-200 bg-white text-slate-700 focus:border-blue-400"
                }`}
              />
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div
              className={`rounded-[24px] border border-dashed p-10 text-center ${
                isDark
                  ? "border-blue-300/20 bg-[#12345c]"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <BadgeDollarSign
                className={`mx-auto h-10 w-10 ${
                  isDark ? "text-blue-200/60" : "text-slate-400"
                }`}
              />
              <h3
                className={`mt-4 text-xl font-bold ${
                  isDark ? "text-white" : "text-slate-800"
                }`}
              >
                No payment records found
              </h3>
              <p
                className={`mt-2 text-sm ${
                  isDark ? "text-blue-200/70" : "text-slate-500"
                }`}
              >
                No matching owner payment records are available right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredPayments.map((p) => {
                const paymentStatus = getStatus(p);
                const payoutStatus = getPayoutStatus(p);

                return (
                  <div
                    key={p.id}
                    className={`rounded-[26px] border p-5 shadow-sm transition hover:shadow-md ${
                      isDark
                        ? "border-blue-400/15 bg-[#12345c]"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3
                            className={`text-3xl font-black ${
                              isDark ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {p.listing_title || "Property"}
                          </h3>

                          <span
                            className={`rounded-full px-4 py-1.5 text-xs font-extrabold tracking-wide ${paymentBadgeClass(
                              paymentStatus
                            )}`}
                          >
                            {paymentStatus}
                          </span>

                          <span
                            className={`rounded-full px-4 py-1.5 text-xs font-extrabold tracking-wide ${payoutBadgeClass(
                              payoutStatus
                            )}`}
                          >
                            Owner payout: {payoutStatus}
                          </span>
                        </div>

                        <p
                          className={`mt-3 text-base ${
                            isDark ? "text-blue-200/80" : "text-slate-600"
                          }`}
                        >
                          Tenant:{" "}
                          <span
                            className={`font-semibold ${
                              isDark ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {p.tenant_name || "-"}
                          </span>
                        </p>
                      </div>

                      <div
                        className={`text-sm font-medium ${
                          isDark ? "text-blue-200/65" : "text-slate-500"
                        }`}
                      >
                        Payment ID: {p.id}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isDark ? "text-blue-200/65" : "text-slate-500"
                          }`}
                        >
                          Total Amount
                        </p>
                        <h4
                          className={`mt-3 text-2xl font-black ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatMoney(p.amount)}
                        </h4>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isDark ? "text-blue-200/65" : "text-slate-500"
                          }`}
                        >
                          Your Share
                        </p>
                        <h4
                          className={`mt-3 text-2xl font-black ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatMoney(p.owner_share_amount)}
                        </h4>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isDark ? "text-blue-200/65" : "text-slate-500"
                          }`}
                        >
                          Payout Date
                        </p>
                        <h4
                          className={`mt-3 text-base font-bold ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatDate(p.owner_payout_date)}
                        </h4>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isDark ? "text-blue-200/65" : "text-slate-500"
                          }`}
                        >
                          Payment Created
                        </p>
                        <h4
                          className={`mt-3 text-base font-bold ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatDate(p.created_at)}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isDark ? "text-blue-200/65" : "text-slate-500"
                          }`}
                        >
                          Owner Payout Note
                        </p>
                        <p
                          className={`mt-3 text-sm leading-7 ${
                            isDark ? "text-blue-50/90" : "text-slate-700"
                          }`}
                        >
                          {p.owner_payout_note || "-"}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-blue-400/15 bg-[#0d325c]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isDark ? "text-blue-200/65" : "text-slate-500"
                          }`}
                        >
                          Extra Info
                        </p>
                        <div
                          className={`mt-3 space-y-2 text-sm ${
                            isDark ? "text-blue-100/85" : "text-slate-700"
                          }`}
                        >
                          <p>
                            <span
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                            >
                              Listing:
                            </span>{" "}
                            {p.listing_title || "-"}
                          </p>
                          <p>
                            <span
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                            >
                              Tenant:
                            </span>{" "}
                            {p.tenant_name || "-"}
                          </p>
                          <p>
                            <span
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                            >
                              Payment Status:
                            </span>{" "}
                            {paymentStatus}
                          </p>
                          <p>
                            <span
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                            >
                              Payout Status:
                            </span>{" "}
                            {payoutStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}