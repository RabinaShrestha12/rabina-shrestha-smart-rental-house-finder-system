import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "tenant_expense_records";

export default function TenantExpenseTracker() {
  const nav = useNavigate();

  const [records, setRecords] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const addExpense = (e) => {
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

    const newItem = {
      id: Date.now(),
      title: form.title.trim(),
      category: form.category,
      amount: amountNum,
      date: form.date,
      note: form.note.trim(),
      created_at: new Date().toISOString(),
    };

    setRecords((prev) => [newItem, ...prev]);

    setForm({
      title: "",
      category: "Food",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    });
  };

  const deleteExpense = (id) => {
    setRecords((prev) => prev.filter((x) => x.id !== id));
  };

  const monthRecords = useMemo(() => {
    return records.filter((r) => String(r.date || "").startsWith(selectedMonth));
  }, [records, selectedMonth]);

  const totalMonthlyExpense = useMemo(() => {
    return monthRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [monthRecords]);

  const categoryTotals = useMemo(() => {
    const map = {};
    monthRecords.forEach((item) => {
      const key = item.category || "Other";
      map[key] = (map[key] || 0) + Number(item.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);

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
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Save Expense
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
                  {monthRecords.length}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-base font-bold">Category Summary</div>

              {categoryTotals.length === 0 ? (
                <div className="mt-3 text-sm text-slate-400">No expenses for this month.</div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {categoryTotals.map(([category, total]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="text-sm text-slate-200">{category}</span>
                      <span className="text-sm font-bold text-white">
                        Rs {total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="text-base font-bold">Expense Records</div>

              {monthRecords.length === 0 ? (
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