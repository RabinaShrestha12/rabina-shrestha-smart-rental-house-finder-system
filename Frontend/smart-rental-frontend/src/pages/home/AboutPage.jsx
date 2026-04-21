import React from "react";
import {
  Home,
  Users,
  Search,
  MapPinned,
  MessageSquare,
  Wrench,
  BedDouble,
  Calculator,
  Bell,
} from "lucide-react";
import { useTheme } from "../../components/ThemeContext";

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="min-h-screen pt-14 pb-16 xl:pt-16 xl:pb-20 selection:bg-blue-600 selection:text-white transition-colors duration-300"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #071120 0%, #0b1e36 45%, #0f2745 100%)"
          : "linear-gradient(180deg, #f4f9ff 0%, #edf6ff 45%, #e8f3ff 100%)",
        color: "var(--text-color)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 xl:px-16">
        <div
          className={`rounded-[32px] xl:rounded-[40px] p-8 md:p-10 xl:p-14 2xl:p-16 shadow-2xl border transition-colors duration-300 ${
            isDark
              ? "bg-[#10294d] border-white/10 shadow-black/20"
              : "bg-[#fbfdff] border-blue-100 shadow-blue-100/40"
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold uppercase tracking-wider mb-6 ${
              isDark
                ? "bg-blue-500/10 border border-blue-400/20 text-blue-300"
                : "bg-blue-50 border border-blue-100 text-blue-600"
            }`}
          >
            <Home className="w-4 h-4" />
            Smart Rental Platform
          </div>

          <h1
            className={`text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-tight mb-8 xl:mb-10 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Smart Rental House Finder System
          </h1>

          <div className="space-y-6 xl:space-y-7">
            <p
              className={`text-base md:text-lg xl:text-[19px] leading-8 xl:leading-9 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <strong>Smart Rental House Finder System</strong> is a modern rental
              platform designed to make room and property searching easier,
              faster, and more practical for everyday users. Instead of relying
              on time-consuming manual searching, the system brings property
              listings, communication, smart recommendations, and helpful tools
              together in one user-friendly place.
            </p>

            <p
              className={`text-base md:text-lg xl:text-[19px] leading-8 xl:leading-9 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              The platform helps users discover rooms, apartments, and houses
              based on important needs such as location, price range, nearby
              facilities, and convenience. With map-based searching and smart
              filtering, users can look for rental options more efficiently and
              compare properties in a clearer and more organized way.
            </p>

            <p
              className={`text-base md:text-lg xl:text-[19px] leading-8 xl:leading-9 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              To make the rental experience more friendly and interactive, the
              system also supports direct communication between tenants and
              owners. Users can send messages, ask about bookings, receive
              updates, and manage rental-related conversations inside the same
              platform, which improves trust and makes the overall process more
              convenient.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-7 my-8 xl:my-10">
              <div
                className={`rounded-3xl p-6 xl:p-7 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f3f9ff] border-blue-100"
                }`}
              >
                <Search className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Smart Search and Recommendations
                </h3>
                <p
                  className={`text-sm xl:text-[15px] leading-7 ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Users can search properties with smart suggestions, budget
                  filters, and location-based matching to quickly find rooms
                  that are more suitable for their needs.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 xl:p-7 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f3f9ff] border-blue-100"
                }`}
              >
                <MapPinned className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Map-Based Property Discovery
                </h3>
                <p
                  className={`text-sm xl:text-[15px] leading-7 ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Interactive map support helps users explore nearby listings and
                  better understand distances to important places such as
                  colleges, bus stops, markets, offices, and hospitals.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 xl:p-7 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f3f9ff] border-blue-100"
                }`}
              >
                <Users className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Roommate Matching
                </h3>
                <p
                  className={`text-sm xl:text-[15px] leading-7 ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  The platform includes a roommate finder that helps users match
                  with people based on preferences such as budget, lifestyle,
                  area, and move-in plans, making shared living more practical.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 xl:p-7 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f3f9ff] border-blue-100"
                }`}
              >
                <MessageSquare className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Direct Communication
                </h3>
                <p
                  className={`text-sm xl:text-[15px] leading-7 ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Built-in messaging allows tenants, owners, and service
                  providers to communicate directly, which improves response time
                  and makes booking or support discussions much smoother.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 xl:p-7 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f3f9ff] border-blue-100"
                }`}
              >
                <Wrench className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Maintenance and Service Support
                </h3>
                <p
                  className={`text-sm xl:text-[15px] leading-7 ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Users can manage maintenance-related communication more easily,
                  while owners and service providers can coordinate support and
                  updates inside the same system.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 xl:p-7 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f3f9ff] border-blue-100"
                }`}
              >
                <Bell className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Helpful Notifications
                </h3>
                <p
                  className={`text-sm xl:text-[15px] leading-7 ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Notifications and reminders keep users informed about booking
                  activity, messages, important updates, and other rental-related
                  actions without needing to search manually.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-7 my-8 xl:my-10">
              <div
                className={`rounded-3xl p-6 xl:p-8 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f5faff] border-blue-100"
                }`}
              >
                <BedDouble className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Better Property Visualization
                </h3>
                <p
                  className={`leading-7 xl:leading-8 text-sm xl:text-base ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  More user-friendly features are also available to make the
                  platform more engaging, including 360° room viewing and virtual
                  furniture arrangement tools. These features help users imagine
                  how a room looks and feels before making a decision.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 xl:p-8 border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#16345c] border-white/10"
                    : "bg-[#f5faff] border-blue-100"
                }`}
              >
                <Calculator className="w-9 h-9 text-blue-600 mb-4" />
                <h3
                  className={`text-xl xl:text-2xl font-bold mb-3 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Budget-Friendly Planning
                </h3>
                <p
                  className={`leading-7 xl:leading-8 text-sm xl:text-base ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  The system also offers practical tools such as budget split
                  support, helping users manage shared living costs more clearly.
                  This makes the platform not only useful for searching, but also
                  helpful for planning everyday rental life.
                </p>
              </div>
            </div>

            <blockquote
              className={`border-l-4 p-6 xl:p-8 rounded-r-2xl italic font-medium my-8 xl:my-10 text-base xl:text-lg leading-8 transition-colors duration-300 ${
                isDark
                  ? "border-blue-400 bg-blue-500/10 text-slate-200"
                  : "border-blue-600 bg-[#f1f8ff] text-slate-700"
              }`}
            >
              "The platform is designed to provide a complete rental experience
              where searching, matching, communication, planning, and support
              are connected in one modern system."
            </blockquote>

            <p
              className={`text-base md:text-lg xl:text-[19px] leading-8 xl:leading-9 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Overall, the system focuses on making rental searching more
              efficient, more transparent, and more comfortable for users. By
              combining modern searching tools with interactive and practical
              features, it creates a stronger and more convenient digital
              rental experience for tenants, owners, and related service users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}