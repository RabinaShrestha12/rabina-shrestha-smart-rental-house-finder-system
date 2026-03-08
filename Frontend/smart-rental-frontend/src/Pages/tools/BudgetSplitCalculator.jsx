import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";

function num(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function money(v) {
  return num(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BudgetSplitCalculator() {
  const nav = useNavigate();

  const [people, setPeople] = useState(2);
  const [rent, setRent] = useState(450);
  const [electricity, setElectricity] = useState(20);
  const [wifi, setWifi] = useState(15);
  const [maintenance, setMaintenance] = useState(0);

  const totalPerWeek = useMemo(() => {
    return num(rent) + num(electricity) + num(wifi) + num(maintenance);
  }, [rent, electricity, wifi, maintenance]);

  const perPersonPerWeek = useMemo(() => {
    const p = Math.max(1, num(people));
    return totalPerWeek / p;
  }, [people, totalPerWeek]);

  const totalPerMonth = useMemo(() => totalPerWeek * 4, [totalPerWeek]);
  const perPersonPerMonth = useMemo(() => perPersonPerWeek * 4, [perPersonPerWeek]);

  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-purple-400/40";

  const StatCard = ({ label, value, sub }) => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-400">{sub}</div> : null}
    </div>
  );

  return (
    <Shell
      title="Budget Split Calculator"
      subtitle="Calculate weekly and monthly rent split quickly."
      right={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => nav(-1)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            ← Back
          </button>
          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            Dashboard
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-cyan-500/10">
          <div className="p-6 md:p-8">
            <div className="inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
              Split Smartly
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              Budget Split Calculator
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Enter rent and weekly bills to see the total cost and how much each
              person should pay. This helps tenants divide shared expenses clearly.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <label className="text-sm font-semibold text-white">
                  Number of People
                </label>
                <input
                  type="number"
                  min="1"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <label className="text-sm font-semibold text-white">
                  Rent (per week)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <label className="text-sm font-semibold text-white">
                  Electricity (per week)
                </label>
                <input
                  type="number"
                  min="0"
                  value={electricity}
                  onChange={(e) => setElectricity(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <label className="text-sm font-semibold text-white">
                  Wi-Fi (per week)
                </label>
                <input
                  type="number"
                  min="0"
                  value={wifi}
                  onChange={(e) => setWifi(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5 md:col-span-2">
                <label className="text-sm font-semibold text-white">
                  Maintenance (per week)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maintenance}
                  onChange={(e) => setMaintenance(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <StatCard
            label="Total / Week"
            value={`Rs ${money(totalPerWeek)}`}
            sub="Combined weekly cost"
          />
          <StatCard
            label="Per Person / Week"
            value={`Rs ${money(perPersonPerWeek)}`}
            sub={`Split between ${Math.max(1, num(people))} people`}
          />
          <StatCard
            label="Total / Month"
            value={`Rs ${money(totalPerMonth)}`}
            sub="Approx. 4 weeks"
          />
          <StatCard
            label="Per Person / Month"
            value={`Rs ${money(perPersonPerMonth)}`}
            sub="Estimated monthly share"
          />

          <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
            <div className="text-sm font-semibold text-amber-200">Quick Tip</div>
            <div className="mt-2 text-sm leading-6 text-amber-100/90">
              Add all shared weekly costs here. For monthly planning, the calculator
              also shows a simple 4-week estimate.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}