import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [people, setPeople] = useState(2);
  const [rent, setRent] = useState(450);
  const [electricity, setElectricity] = useState(20);
  const [wifi, setWifi] = useState(15);
  const [maintenance, setMaintenance] = useState(0);

  const totalPerWeek = useMemo(() => {
    return num(rent) + num(electricity) + num(wifi) + num(maintenance);
  }, [rent, electricity, wifi, maintenance]);

  const safePeople = Math.max(1, num(people));

  const perPersonPerWeek = useMemo(() => {
    return totalPerWeek / safePeople;
  }, [safePeople, totalPerWeek]);

  const totalPerMonth = useMemo(() => totalPerWeek * 4, [totalPerWeek]);
  const perPersonPerMonth = useMemo(() => perPersonPerWeek * 4, [perPersonPerWeek]);

  const inputClass = isDark
    ? "mt-3 w-full rounded-2xl border border-white/10 bg-[#123a64] px-4 py-3 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-blue-100/45 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
    : "mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  const cardClass = isDark
    ? "rounded-[28px] border border-white/10 bg-[#0f3258]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
    : "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";

  const fieldCardClass = isDark
    ? "rounded-[24px] border border-white/10 bg-[#123a64] p-5 transition-all duration-200"
    : "rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition-all duration-200";

  const mainPanelClass = isDark
    ? "overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(135deg,_#071120_0%,_#0b2542_45%,_#0f3258_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
    : "overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 shadow-sm";

  const badgeClass = isDark
    ? "inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold tracking-wide text-blue-200"
    : "inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1.5 text-xs font-bold tracking-wide text-blue-700";

  const quickTipClass = isDark
    ? "rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-6 shadow-sm"
    : "rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm";

  const StatCard = ({ label, value, sub }) => (
    <div className={cardClass}>
      <div
        className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
          isDark ? "text-blue-100/65" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-3 text-3xl font-black tracking-tight xl:text-[2rem] ${
          isDark ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {sub}
        </div>
      ) : null}
    </div>
  );

  return (
    <Shell
      title="Budget Split Calculator"
      subtitle="Calculate weekly and monthly rent split quickly."
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
      <div className="mx-auto w-full max-w-[1500px] px-2 pb-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={mainPanelClass}>
            <div className="p-8 xl:p-10">
              <div className={badgeClass}>Split Smartly</div>

              <h2
                className={`mt-5 text-3xl font-black tracking-tight xl:text-[2.4rem] ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Budget Split Calculator
              </h2>

              <p
                className={`mt-4 max-w-3xl text-[15px] leading-7 xl:text-base ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Enter rent and weekly bills to see the total shared cost and how
                much each person should pay. This desktop layout is designed to
                look clean, balanced, and easy to use.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className={fieldCardClass}>
                  <label
                    className={`text-sm font-semibold ${
                      isDark ? "text-slate-100" : "text-slate-700"
                    }`}
                  >
                    Number of People
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={people}
                    onChange={(e) => setPeople(e.target.value)}
                    className={inputClass}
                    placeholder="Enter number of people"
                  />
                </div>

                <div className={fieldCardClass}>
                  <label
                    className={`text-sm font-semibold ${
                      isDark ? "text-slate-100" : "text-slate-700"
                    }`}
                  >
                    Rent (per week)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    className={inputClass}
                    placeholder="Enter weekly rent"
                  />
                </div>

                <div className={fieldCardClass}>
                  <label
                    className={`text-sm font-semibold ${
                      isDark ? "text-slate-100" : "text-slate-700"
                    }`}
                  >
                    Electricity (per week)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={electricity}
                    onChange={(e) => setElectricity(e.target.value)}
                    className={inputClass}
                    placeholder="Enter electricity cost"
                  />
                </div>

                <div className={fieldCardClass}>
                  <label
                    className={`text-sm font-semibold ${
                      isDark ? "text-slate-100" : "text-slate-700"
                    }`}
                  >
                    Wi-Fi (per week)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wifi}
                    onChange={(e) => setWifi(e.target.value)}
                    className={inputClass}
                    placeholder="Enter Wi-Fi cost"
                  />
                </div>

                <div className={`${fieldCardClass} md:col-span-2`}>
                  <label
                    className={`text-sm font-semibold ${
                      isDark ? "text-slate-100" : "text-slate-700"
                    }`}
                  >
                    Maintenance (per week)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maintenance}
                    onChange={(e) => setMaintenance(e.target.value)}
                    className={inputClass}
                    placeholder="Enter maintenance cost"
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
              sub={`Split between ${safePeople} people`}
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

            <div className={quickTipClass}>
              <div
                className={`text-sm font-bold ${
                  isDark ? "text-amber-300" : "text-amber-700"
                }`}
              >
                Quick Tip
              </div>
              <div
                className={`mt-2 text-sm leading-7 ${
                  isDark ? "text-amber-100/90" : "text-amber-800"
                }`}
              >
                Add all shared weekly costs here. For monthly planning, the
                calculator uses a simple 4-week estimate so tenants can quickly
                understand their expected contribution.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}