import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function RemindersPage() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    reminder_type: "rent",
    title: "",
    amount: "",
    due_date: "",
    repeat_monthly: false,
  });

  async function load() {
    setMsg("");
    try {
      const res = await api.get("reminders/");
      setItems(res.data || []);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to load reminders.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setMsg("");

    if (!form.title || !form.due_date) {
      setMsg("Title and Due Date are required.");
      return;
    }

    try {
      await api.post("reminders/create/", {
        reminder_type: form.reminder_type,
        title: form.title,
        amount: form.amount ? Number(form.amount) : null,
        due_date: form.due_date,
        repeat_monthly: form.repeat_monthly,
      });
      setForm({
        reminder_type: "rent",
        title: "",
        amount: "",
        due_date: "",
        repeat_monthly: false,
      });
      setMsg("✅ Reminder created!");
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to create reminder.");
    }
  }

  async function markDone(id, is_done) {
    setMsg("");
    try {
      await api.patch(`reminders/${id}/`, { is_done: !is_done });
      load();
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Failed to update reminder.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-5">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <p className="opacity-70 text-sm mt-1">Rent / Water / Electricity reminders (in-app).</p>

        {msg && (
          <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            {msg}
          </div>
        )}

        {/* Create Reminder */}
        <form onSubmit={create} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm font-semibold mb-1">Type</div>
            <select
              value={form.reminder_type}
              onChange={(e) => setForm((p) => ({ ...p, reminder_type: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="rent">Rent</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm font-semibold mb-1">Title</div>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              placeholder="e.g., Pay rent"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold mb-1">Amount (optional)</div>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              placeholder="e.g., 450"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold mb-1">Due date</div>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </label>

          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={form.repeat_monthly}
              onChange={(e) => setForm((p) => ({ ...p, repeat_monthly: e.target.checked }))}
            />
            <span className="text-sm font-semibold">Repeat monthly</span>
          </label>

          <button
            type="submit"
            className="md:col-span-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Add Reminder
          </button>
        </form>

        {/* List */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">My Reminders</h2>
          {items.length === 0 ? (
            <div className="opacity-70">No reminders yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="font-bold">
                      {r.title}{" "}
                      <span className="text-xs opacity-70">
                        ({r.reminder_type})
                      </span>
                    </div>
                    <div className="text-sm opacity-70">
                      Due: {r.due_date} {r.repeat_monthly ? "• Monthly" : ""}
                    </div>
                  </div>

                  {r.amount != null && (
                    <div className="text-sm mt-1 opacity-90">Amount: {r.amount}</div>
                  )}

                  <div className="mt-3">
                    <button
                      onClick={() => markDone(r.id, r.is_done)}
                      className={`px-3 py-2 rounded-xl font-semibold ${
                        r.is_done
                          ? "bg-slate-300 dark:bg-slate-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {r.is_done ? "Mark as Pending" : "Mark as Done"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={load}
            className="mt-5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
