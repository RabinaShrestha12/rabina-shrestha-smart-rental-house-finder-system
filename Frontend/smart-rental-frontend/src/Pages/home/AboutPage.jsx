import React, { useState } from "react";
import PublicNavbar from "../../components/PublicNavbar";

export default function AboutPage() {
  const [darkMode, setDarkMode] = useState(false);
  const isDark = darkMode;

  const pageBg = isDark
    ? "min-h-screen bg-[radial-gradient(circle_at_top_left,_#08224a_0%,_#071738_28%,_#04112b_58%,_#020816_100%)] text-white"
    : "min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-100 text-slate-900";

  const heading = isDark ? "text-white" : "text-blue-950";
  const sub = isDark ? "text-slate-300" : "text-slate-700";
  const softCard = isDark
    ? "border border-white/10 bg-white/5"
    : "border border-blue-100 bg-white";

  return (
    <div className={pageBg}>
      <PublicNavbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        active="about"
      />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className={`rounded-[32px] p-10 shadow-2xl ${softCard}`}>
          <h2 className={`text-4xl font-extrabold ${heading}`}>
            Smart Rental House Finder System
          </h2>

          <p className={`mt-6 text-lg leading-8 ${sub}`}>
            The Smart Rental House Finder System is a Final Year Project created
            to improve the way people search for rental accommodation. Instead
            of depending only on manual searching, the system provides a modern
            digital platform where users can explore rooms, apartments, and
            houses more easily and more efficiently.
          </p>

          <p className={`mt-5 text-lg leading-8 ${sub}`}>
            The project is designed to support a smarter rental experience by
            bringing together better searching, stronger user interaction, and
            more practical property presentation. It is intended to improve how
            tenants discover suitable places, how owners display and manage
            their properties, and how users interact with important tools inside
            the platform.
          </p>

          <p className={`mt-5 text-lg leading-8 ${sub}`}>
            The system also includes broader ideas that make it more advanced
            and useful, such as intelligent suggestion support, budget-related
            planning, better location-based exploration, virtual viewing,
            reminders, communication tools, and maintenance support. Rather than
            presenting these only as separate technical items, the project aims
            to combine them into one smooth and user-friendly rental system.
          </p>

          <p className={`mt-5 text-lg leading-8 ${sub}`}>
            Overall, the goal of the project is to create an attractive,
            practical, and modern rental platform that helps users save time,
            make better rental decisions, and experience a more organized
            property journey from searching to booking.
          </p>
        </div>
      </section>
    </div>
  );
}