import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";

export default function TenantExpenseTracker() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  const categories = [
    "Food",
    "Clothes",
    "Travel",
    "Rent",
    "Education",
    "Bills",
    "Health",
    "Shopping",
    "Entertainment",
    "Other",
  ];

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

  const monthRecords = useMemo(() => records || [], [records]);

  const totalMonthlyExpense = useMemo(() => {
    return Number(summary?.total_monthly_expense || 0);
  }, [summary]);

  const categoryTotals = useMemo(() => {
    return summary?.category_summary || [];
  }, [summary]);

  const pageWrapClass = isDark
    ? "mx-auto w-full max-w-[1500px] px-2 pb-10 text-white"
    : "mx-auto w-full max-w-[1500px] px-2 pb-10 text-slate-900";

  const inputClass = isDark
    ? "w-full rounded-2xl border border-white/10 bg-[#123a64] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-blue-100/45 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
    : "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  const panelClass = isDark
    ? "rounded-[28px] border border-white/10 bg-[#0f3258]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-colors"
    : "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-colors";

  const innerCardClass = isDark
    ? "rounded-[22px] border border-white/10 bg-[#123a64] p-4 transition-colors"
    : "rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition-colors";

  const summaryCardGreen = isDark
    ? "rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-5 transition-colors"
    : "rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 transition-colors";

  const summaryCardCyan = isDark
    ? "rounded-[22px] border border-cyan-400/20 bg-cyan-500/10 p-5 transition-colors"
    : "rounded-[22px] border border-cyan-200 bg-cyan-50 p-5 transition-colors";

  return (
    <Shell
      title="Expense Tracker"
      subtitle="Store your daily expenses and check your monthly spending record."
      right={
        <div className="flex flex-wrap items-center gap-3">
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
        {error ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              isDark
                ? "border-red-400/20 bg-red-500/10 text-red-200"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.25fr]">
          <div className={panelClass}>
            <div className="mb-5">
              <h2
                className={`text-2xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Add Expense
              </h2>
            </div>

            <form onSubmit={addExpense} className="grid gap-4">
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Expense name (Food, Travel, Clothes...)"
                className={inputClass}
              />

              <select
                name="category"
                value={form.category}
                onChange={onChange}
                className={inputClass}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={onChange}
                placeholder="Amount"
                className={inputClass}
              />

              <input
                type="date"
                name="date"
                value={form.date}
                onChange={onChange}
                className={inputClass}
              />

              <textarea
                name="note"
                value={form.note}
                onChange={onChange}
                rows={4}
                placeholder="Optional note"
                className={`${inputClass} resize-none`}
              />

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Expense"}
              </button>
            </form>
          </div>

          <div className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                className={`text-2xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Monthly Expense Record
              </h2>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`rounded-2xl border px-4 py-2.5 text-sm outline-none transition ${
                  isDark
                    ? "border-white/10 bg-[#123a64] text-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    : "border-slate-300 bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                }`}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className={summaryCardGreen}>
                <div
                  className={`text-sm font-semibold ${
                    isDark ? "text-emerald-300" : "text-emerald-700"
                  }`}
                >
                  Total Monthly Expense
                </div>
                <div
                  className={`mt-2 text-4xl font-black tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Rs {totalMonthlyExpense.toLocaleString()}
                </div>
              </div>

              <div className={summaryCardCyan}>
                <div
                  className={`text-sm font-semibold ${
                    isDark ? "text-cyan-300" : "text-cyan-700"
                  }`}
                >
                  Total Records
                </div>
                <div
                  className={`mt-2 text-4xl font-black tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {summary?.total_records || 0}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className={innerCardClass}>
                <div
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Category Summary
                </div>

                {categoryTotals.length === 0 ? (
                  <div
                    className={`mt-3 text-sm ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    No expenses for this month.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {categoryTotals.map((item, idx) => (
                      <div
                        key={`${item.category}-${idx}`}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                          isDark
                            ? "border-white/10 bg-[#0d2948]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          {item.category}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Rs {Number(item.total || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div
                className={`mb-3 text-lg font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Expense Records
              </div>

              {loading ? (
                <div className={innerCardClass}>
                  <div
                    className={`text-sm ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Loading expenses...
                  </div>
                </div>
              ) : monthRecords.length === 0 ? (
                <div className={innerCardClass}>
                  <div
                    className={`text-sm ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    No expense records found for this month.
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {monthRecords.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-[22px] border p-5 shadow-sm transition-colors ${
                        isDark
                          ? "border-white/10 bg-[#123a64]"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-[220px] flex-1">
                          <div
                            className={`text-lg font-bold ${
                              isDark ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {item.title}
                          </div>
                          <div
                            className={`mt-1 text-sm ${
                              isDark ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            {item.category} • {item.date}
                          </div>
                          {item.note ? (
                            <div
                              className={`mt-3 text-sm leading-6 ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {item.note}
                            </div>
                          ) : null}
                        </div>

                        <div className="min-w-[140px] text-right">
                          <div
                            className={`text-xl font-black ${
                              isDark ? "text-emerald-300" : "text-emerald-700"
                            }`}
                          >
                            Rs {Number(item.amount).toLocaleString()}
                          </div>
                          <button
                            onClick={() => deleteExpense(item.id)}
                            className={`mt-3 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              isDark
                                ? "border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
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
    </Shell>
  );
}