import React, { useMemo, useState } from "react";

export default function BudgetSplitCalculator() {
  const [people, setPeople] = useState(2);
  const [rent, setRent] = useState(450);
  const [electricity, setElectricity] = useState(20);
  const [wifi, setWifi] = useState(15);
  const [maintenance, setMaintenance] = useState(0);

  const total = useMemo(() => {
    const r = Number(rent) || 0;
    const e = Number(electricity) || 0;
    const w = Number(wifi) || 0;
    const m = Number(maintenance) || 0;
    return r + e + w + m;
  }, [rent, electricity, wifi, maintenance]);

  const perPerson = useMemo(() => {
    const p = Math.max(1, Number(people) || 1);
    return total / p;
  }, [total, people]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-5">
        <h1 className="text-2xl font-bold mb-4">Budget Split Calculator</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Number of People" value={people} onChange={setPeople} />
          <Field label="Rent (per week)" value={rent} onChange={setRent} />
          <Field label="Electricity (per week)" value={electricity} onChange={setElectricity} />
          <Field label="Wi-Fi (per week)" value={wifi} onChange={setWifi} />
          <Field label="Maintenance (per week)" value={maintenance} onChange={setMaintenance} />
        </div>

        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
          <div className="flex justify-between">
            <span className="font-semibold">Total / week</span>
            <span className="font-bold">{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-semibold">Per person / week</span>
            <span className="font-bold">{perPerson.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
      />
    </label>
  );
}
