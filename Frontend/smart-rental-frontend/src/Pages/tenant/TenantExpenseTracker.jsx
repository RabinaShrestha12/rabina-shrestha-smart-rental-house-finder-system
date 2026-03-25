import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

export default function TenantExpenseTracker() {
  const nav = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({
    total_monthly_expense: "0.00",
    total_records: 0,
    category_summary: [],
  });

  const [form, setForm] = useState({
    title: "",
    category: "Food",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [error, setError] = useState("");

  const getMonthYear = () => {
    const [year, month] = selectedMonth.split("-");
    return { month: Number(month), year: Number(year) };
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const { month, year } = getMonthYear();

      const res = await axios.get(`/tenant/expenses/`, {
        params: { month, year },
      });

      setRecords(res.data?.results || []);
      setSummary(
        res.data?.summary || {
          total_monthly_expense: "0.00",
          total_records: 0,
          category_summary: [],
        }
      );
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      setError("Failed to load expenses.");
      setRecords([]);
      setSummary({
        total_monthly_expense: "0.00",
        total_records: 0,
        category_summary: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMonthNotification = async () => {
    try {
      const today = new Date();
      const { month, year } = getMonthYear();

      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const isCurrentMonth = month === currentMonth && year === currentYear;

      if (!isCurrentMonth) return;

      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const todayDate = today.getDate();

      if (todayDate >= lastDay) {
        await axios.post(`/tenant/expenses/generate-month-notification/`, {
          month,
          year,
        });
      }
    } catch (err) {
      console.error("Notification generation skipped/failed:", err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth]);

  useEffect(() => {
    generateMonthNotification();
  }, [selectedMonth]);

  const addExpense = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter expense name.");
      return;
    }

    const amountNum = Number(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await axios.post(`/tenant/expenses/`, {
        title: form.title.trim(),
        category: form.category,
        amount: amountNum,
        date: form.date,
        note: form.note.trim(),
      });

      setForm({
        title: "",
        category: "Food",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        note: "",
      });

      await fetchExpenses();
      alert("Expense saved successfully.");
    } catch (err) {
      console.error("Failed to save expense:", err);
      console.log("Backend error response:", err?.response?.data);
      setError("Failed to save expense.");
      alert("Could not save expense. Check backend/API.");
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id) => {
    const yes = window.confirm("Are you sure you want to delete this expense?");
    if (!yes) return;

    try {
      await axios.delete(`/tenant/expenses/${id}/`);
      await fetchExpenses();
    } catch (err) {
      console.error("Failed to delete expense:", err);
      alert("Could not delete expense.");
    }
  };

  const monthRecords = useMemo(() => {
    return records || [];
  }, [records]);

  const totalMonthlyExpense = useMemo(() => {
    return Number(summary?.total_monthly_expense || 0);
  }, [summary]);

  const categoryTotals = useMemo(() => {
    return summary?.category_summary || [];
  }, [summary]);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">💰 Expense Tracker</h1>
            <p className="mt-1 text-sm text-slate-300">
              Store your daily expenses and check your monthly spending record.
            </p>
          </div>

          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Back to Dashboard
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-xl font-bold">Add Expense</div>

            <form onSubmit={addExpense} className="mt-4 grid gap-4">
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Expense name (Food, Travel, Clothes...)"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />

              <select
                name="category"
                value={form.category}
                onChange={onChange}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="Food">Food</option>
                <option value="Clothes">Clothes</option>
                <option value="Travel">Travel</option>
                <option value="Rent">Rent</option>
                <option value="Education">Education</option>
                <option value="Bills">Bills</option>
                <option value="Health">Health</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>

              <input
                type="number"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={onChange}
                placeholder="Amount"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />

              <input
                type="date"
                name="date"
                value={form.date}
                onChange={onChange}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />

              <textarea
                name="note"
                value={form.note}
                onChange={onChange}
                rows={3}
                placeholder="Optional note"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Expense"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xl font-bold">Monthly Expense Record</div>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="text-sm text-emerald-200">Total Monthly Expense</div>
                <div className="mt-2 text-3xl font-black text-white">
                  Rs {totalMonthlyExpense.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="text-sm text-cyan-200">Total Records</div>
                <div className="mt-2 text-3xl font-black text-white">
                  {summary?.total_records || 0}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-base font-bold">Category Summary</div>

              {categoryTotals.length === 0 ? (
                <div className="mt-3 text-sm text-slate-400">No expenses for this month.</div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {categoryTotals.map((item, idx) => (
                    <div
                      key={`${item.category}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="text-sm text-slate-200">{item.category}</span>
                      <span className="text-sm font-bold text-white">
                        Rs {Number(item.total || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="text-base font-bold">Expense Records</div>

              {loading ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  Loading expenses...
                </div>
              ) : monthRecords.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No expense records found for this month.
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {monthRecords.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-bold text-white">{item.title}</div>
                          <div className="mt-1 text-sm text-slate-300">
                            {item.category} • {item.date}
                          </div>
                          {item.note ? (
                            <div className="mt-2 text-sm text-slate-400">{item.note}</div>
                          ) : null}
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-200">
                            Rs {Number(item.amount).toLocaleString()}
                          </div>
                          <button
                            onClick={() => deleteExpense(item.id)}
                            className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs text-red-200 transition hover:bg-red-500/15"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}