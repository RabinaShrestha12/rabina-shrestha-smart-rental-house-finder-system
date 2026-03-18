import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function TenantBookingPayments() {
  const nav = useNavigate();

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

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">💳 My Rent Payment History</h1>
            <p className="mt-1 text-sm text-slate-300">
              View how much you paid, which month, to which owner, and payment status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadPayments}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Refresh
            </button>

            <button
              onClick={() => nav("/tenant")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
            <div className="text-sm text-blue-200">Total Payment Records</div>
            <div className="mt-2 text-3xl font-black text-white">{payments.length}</div>
          </div>

          <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4">
            <div className="text-sm text-green-200">Total Successfully Paid</div>
            <div className="mt-2 text-3xl font-black text-white">
              Rs {totalPaid.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4">
            <div className="text-sm text-purple-200">Completed Payments</div>
            <div className="mt-2 text-3xl font-black text-white">
              {
                payments.filter(
                  (p) => String(p.payment_status || "").toUpperCase() === "COMPLETE"
                ).length
              }
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xl font-bold">Payment Details</div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by owner, property, month, status..."
              className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              Loading payment records...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              No payment records found.
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {filteredPayments.map((p) => {
                const status = String(p.payment_status || "").toUpperCase();
                const statusClass =
                  status === "COMPLETE"
                    ? "border-green-400/20 bg-green-500/10 text-green-200"
                    : status === "PENDING"
                    ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    : "border-red-400/20 bg-red-500/10 text-red-200";

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-bold text-white">
                          {p.listing_title || "Property"}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Owner:{" "}
                          {p.owner_name ||
                            p.owner_username ||
                            p.owner_email ||
                            "Owner"}
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}
                      >
                        {status || "UNKNOWN"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-slate-400">Amount Paid</div>
                        <div className="mt-1 text-lg font-bold text-white">
                          Rs {Number(p.amount || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-slate-400">Payment Month</div>
                        <div className="mt-1 text-lg font-bold text-white">
                          {p.payment_month || "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-slate-400">Created Date</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleString()
                            : "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-slate-400">Verified Date</div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {p.verified_at
                            ? new Date(p.verified_at).toLocaleString()
                            : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-slate-400">Transaction UUID</div>
                        <div className="mt-1 break-all text-sm font-medium text-white">
                          {p.transaction_uuid || "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-slate-400">Ref ID</div>
                        <div className="mt-1 break-all text-sm font-medium text-white">
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
    </div>
  );
}