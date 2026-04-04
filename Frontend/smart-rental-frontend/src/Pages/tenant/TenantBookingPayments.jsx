import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";

export default function TenantBookingPayments() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tenant/booking-payments/my/");
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];
      setPayments(data);
    } catch (err) {
      console.error(err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return payments;

    return payments.filter((p) => {
      const text = `
        ${p.owner_name || p.owner_username || p.owner_email || ""}
        ${p.listing_title || ""}
        ${p.payment_month || ""}
        ${p.payment_status || ""}
        ${p.amount || ""}
        ${p.ref_id || ""}
      `.toLowerCase();

      return text.includes(q);
    });
  }, [payments, query]);

  const totalPaid = useMemo(() => {
    return payments
      .filter((p) => String(p.payment_status || "").toUpperCase() === "COMPLETE")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const totalCompleted = useMemo(() => {
    return payments.filter(
      (p) => String(p.payment_status || "").toUpperCase() === "COMPLETE"
    ).length;
  }, [payments]);

  const pageWrapClass = isDark
    ? "mx-auto w-full max-w-[1500px] px-2 pb-10 text-white"
    : "mx-auto w-full max-w-[1500px] px-2 pb-10 text-slate-900";

  const mainPanelClass = isDark
    ? "rounded-[28px] border border-white/10 bg-[#0f3258]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-colors"
    : "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-colors";

  const softCardClass = isDark
    ? "rounded-[22px] border border-white/10 bg-[#123a64] p-5 transition-colors"
    : "rounded-[22px] border border-slate-200 bg-slate-50 p-5 transition-colors";

  const innerStatCardClass = isDark
    ? "rounded-[20px] border border-white/10 bg-[#0d2948] p-4 transition-colors"
    : "rounded-[20px] border border-slate-200 bg-white p-4 transition-colors";

  const inputClass = isDark
    ? "w-full max-w-md rounded-2xl border border-white/10 bg-[#123a64] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-blue-100/45 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
    : "w-full max-w-md rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  const topBlueCard = isDark
    ? "rounded-[24px] border border-blue-400/20 bg-blue-500/10 p-5 transition-colors"
    : "rounded-[24px] border border-blue-200 bg-blue-50 p-5 transition-colors";

  const topGreenCard = isDark
    ? "rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-5 transition-colors"
    : "rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 transition-colors";

  const topPurpleCard = isDark
    ? "rounded-[24px] border border-purple-400/20 bg-purple-500/10 p-5 transition-colors"
    : "rounded-[24px] border border-purple-200 bg-purple-50 p-5 transition-colors";

  return (
    <Shell
      title="My Rent Payment History"
      subtitle="View how much you paid, which month, to which owner, and payment status."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadPayments}
            className={`rounded-2xl border px-5 py-2.5 text-sm font-semibold transition ${
              isDark
                ? "border-white/10 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Refresh
          </button>

          <button
            onClick={() => nav(-1)}
            className={`rounded-2xl border px-5 py-2.5 text-sm font-semibold transition ${
              isDark
                ? "border-white/10 bg-[#123a64] text-blue-100 hover:bg-[#174876]"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            ← Back
          </button>

          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Dashboard
          </button>
        </div>
      }
    >
      <div className={pageWrapClass}>
        <div className="grid gap-5 md:grid-cols-3">
          <div className={topBlueCard}>
            <div
              className={`text-sm font-semibold ${
                isDark ? "text-blue-300" : "text-blue-700"
              }`}
            >
              Total Payment Records
            </div>
            <div
              className={`mt-2 text-4xl font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {payments.length}
            </div>
          </div>

          <div className={topGreenCard}>
            <div
              className={`text-sm font-semibold ${
                isDark ? "text-emerald-300" : "text-emerald-700"
              }`}
            >
              Total Successfully Paid
            </div>
            <div
              className={`mt-2 text-4xl font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Rs {totalPaid.toLocaleString()}
            </div>
          </div>

          <div className={topPurpleCard}>
            <div
              className={`text-sm font-semibold ${
                isDark ? "text-purple-300" : "text-purple-700"
              }`}
            >
              Completed Payments
            </div>
            <div
              className={`mt-2 text-4xl font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {totalCompleted}
            </div>
          </div>
        </div>

        <div className={`mt-6 ${mainPanelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              className={`text-2xl font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Payment Details
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by owner, property, month, status..."
              className={inputClass}
            />
          </div>

          {loading ? (
            <div className={`mt-5 ${softCardClass}`}>
              <div
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Loading payment records...
              </div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className={`mt-5 ${softCardClass}`}>
              <div
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                No payment records found.
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              {filteredPayments.map((p) => {
                const status = String(p.payment_status || "").toUpperCase();

                const statusClass =
                  status === "COMPLETE"
                    ? isDark
                      ? "border-green-400/20 bg-green-500/10 text-green-300"
                      : "border-green-200 bg-green-50 text-green-700"
                    : status === "PENDING"
                    ? isDark
                      ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                    : isDark
                    ? "border-red-400/20 bg-red-500/10 text-red-300"
                    : "border-red-200 bg-red-50 text-red-700";

                return (
                  <div
                    key={p.id}
                    className={`rounded-[24px] border p-5 shadow-sm transition-colors ${
                      isDark
                        ? "border-white/10 bg-[#123a64]"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div
                          className={`text-2xl font-black tracking-tight ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {p.listing_title || "Property"}
                        </div>
                        <div
                          className={`mt-1 text-sm ${
                            isDark ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          Owner:{" "}
                          {p.owner_name ||
                            p.owner_username ||
                            p.owner_email ||
                            "Owner"}
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide ${statusClass}`}
                      >
                        {status || "UNKNOWN"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className={innerStatCardClass}>
                        <div
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Amount Paid
                        </div>
                        <div
                          className={`mt-2 text-2xl font-black ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Rs {Number(p.amount || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className={innerStatCardClass}>
                        <div
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Payment Month
                        </div>
                        <div
                          className={`mt-2 text-2xl font-black ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {p.payment_month || "-"}
                        </div>
                      </div>

                      <div className={innerStatCardClass}>
                        <div
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Created Date
                        </div>
                        <div
                          className={`mt-2 text-sm font-semibold leading-6 ${
                            isDark ? "text-slate-100" : "text-slate-800"
                          }`}
                        >
                          {p.created_at
                            ? new Date(p.created_at).toLocaleString()
                            : "-"}
                        </div>
                      </div>

                      <div className={innerStatCardClass}>
                        <div
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Verified Date
                        </div>
                        <div
                          className={`mt-2 text-sm font-semibold leading-6 ${
                            isDark ? "text-slate-100" : "text-slate-800"
                          }`}
                        >
                          {p.verified_at
                            ? new Date(p.verified_at).toLocaleString()
                            : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className={innerStatCardClass}>
                        <div
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Transaction UUID
                        </div>
                        <div
                          className={`mt-2 break-all text-sm font-semibold leading-6 ${
                            isDark ? "text-slate-100" : "text-slate-800"
                          }`}
                        >
                          {p.transaction_uuid || "-"}
                        </div>
                      </div>

                      <div className={innerStatCardClass}>
                        <div
                          className={`text-xs font-medium uppercase tracking-wide ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Ref ID
                        </div>
                        <div
                          className={`mt-2 break-all text-sm font-semibold leading-6 ${
                            isDark ? "text-slate-100" : "text-slate-800"
                          }`}
                        >
                          {p.ref_id || "-"}
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
    </Shell>
  );
}