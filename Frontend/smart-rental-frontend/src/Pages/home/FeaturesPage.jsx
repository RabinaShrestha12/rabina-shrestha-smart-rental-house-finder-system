import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function FeaturesPage() {
  const nav = useNavigate();

  const [darkMode, setDarkMode] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [propertyType, setPropertyType] = useState("All");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isDark = darkMode;

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get("http://127.0.0.1:8000/api/listings/public/");
      setListings(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
      setError("Could not load properties.");
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const title = (
        item.title ||
        item.name ||
        item.property_title ||
        ""
      ).toLowerCase();

      const description = (
        item.description ||
        item.details ||
        item.address ||
        ""
      ).toLowerCase();

      const location = (
        item.location ||
        item.city ||
        item.area ||
        item.address ||
        ""
      ).toLowerCase();

      const type = (
        item.property_type ||
        item.type ||
        item.category ||
        ""
      ).toLowerCase();

      const matchSearch =
        !searchText ||
        title.includes(searchText.toLowerCase()) ||
        description.includes(searchText.toLowerCase());

      const matchLocation =
        !locationText || location.includes(locationText.toLowerCase());

      const matchType =
        propertyType === "All" || type === propertyType.toLowerCase();

      return matchSearch && matchLocation && matchType;
    });
  }, [listings, searchText, locationText, propertyType]);

  const getImage = (item) =>
    item.cover_image ||
    item.image ||
    item.thumbnail ||
    item.photo ||
    item.main_image ||
    (item.images && item.images[0]) ||
    "/no-image.png";

  const getTitle = (item) =>
    item.title || item.name || item.property_title || "Untitled Property";

  const getLocation = (item) =>
    item.location ||
    item.city ||
    item.area ||
    item.address ||
    "Location not available";

  const getType = (item) =>
    item.property_type || item.type || item.category || "Property";

  const getPrice = (item) =>
    item.price_per_month ||
    item.monthly_rent ||
    item.rent ||
    item.price ||
    "Price not available";

  const getDescription = (item) =>
    item.description || item.details || "No description available.";

  const pageBg = isDark
    ? "min-h-screen bg-[radial-gradient(circle_at_top_left,_#08224a_0%,_#071738_28%,_#04112b_58%,_#020816_100%)] text-white"
    : "min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-100 text-slate-900";

  const navBg = isDark
    ? "border-b border-white/10 bg-[#03081c]/90"
    : "border-b border-blue-200 bg-white/90";

  const heading = isDark ? "text-white" : "text-blue-950";
  const sub = isDark ? "text-slate-300" : "text-slate-600";
  const softText = isDark ? "text-slate-400" : "text-slate-500";

  const cardClass = isDark
    ? "border border-white/10 bg-white/5"
    : "border border-blue-100 bg-white";

  const linkBase =
    "rounded-full px-5 py-2 text-sm font-semibold transition duration-200";

  return (
    <div className={pageBg}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${navBg}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
              SRHFS
            </div>

            <div>
              <h1 className={`text-xl font-extrabold ${heading}`}>
                Smart Rental House Finder
              </h1>
              <p className={`text-xs ${sub}`}>Modern Rental Platform</p>
            </div>
          </div>

          <nav className="hidden items-center gap-3 md:flex">
            <Link
              to="/"
              className={`${linkBase} ${
                isDark
                  ? "bg-white/5 text-white hover:bg-blue-600"
                  : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              Home
            </Link>

            <Link
              to="/features"
              className={`${linkBase} ${
                isDark
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-blue-100 text-blue-950 shadow"
              }`}
            >
              Features
            </Link>

            <Link
              to="/about"
              className={`${linkBase} ${
                isDark
                  ? "bg-white/5 text-white hover:bg-blue-600"
                  : "bg-blue-50 text-blue-950 hover:bg-blue-700 hover:text-white"
              }`}
            >
              About
            </Link>

            <Link
              to="/auth"
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
            >
              Login
            </Link>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isDark
                  ? "bg-white text-slate-900 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-blue-950"
              }`}
            >
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
          </nav>
        </div>
      </header>

      {/* Search Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className={`rounded-[28px] p-6 shadow-2xl ${cardClass}`}>
          <div className="mb-6">
            <h2 className={`text-3xl font-extrabold ${heading}`}>
              Browse Available Properties
            </h2>
            <p className={`mt-2 ${sub}`}>
              Search owner-added rooms, apartments, and houses
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title"
              className={`rounded-2xl border px-4 py-3 outline-none ${
                isDark
                  ? "border-white/10 bg-slate-900/70 text-white placeholder:text-slate-400"
                  : "border-blue-100 bg-slate-50 text-slate-900 placeholder:text-slate-400"
              }`}
            />

            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Location"
              className={`rounded-2xl border px-4 py-3 outline-none ${
                isDark
                  ? "border-white/10 bg-slate-900/70 text-white placeholder:text-slate-400"
                  : "border-blue-100 bg-slate-50 text-slate-900 placeholder:text-slate-400"
              }`}
            />

            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={`rounded-2xl border px-4 py-3 outline-none ${
                isDark
                  ? "border-white/10 bg-slate-900/70 text-white"
                  : "border-blue-100 bg-slate-50 text-slate-900"
              }`}
            >
              <option>All</option>
              <option>Room</option>
              <option>Apartment</option>
              <option>House</option>
            </select>

            <button
              onClick={() => {
                setSearchText("");
                setLocationText("");
                setPropertyType("All");
              }}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 font-semibold text-white"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={`text-3xl font-extrabold ${heading}`}>
              Available Listings
            </h3>
            <p className={`mt-2 ${sub}`}>Showing real properties from the system</p>
          </div>

          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              isDark
                ? "border border-white/10 bg-white/5 text-white"
                : "border border-blue-100 bg-white text-slate-700"
            }`}
          >
            {filteredListings.length} found
          </div>
        </div>

        {loading ? (
          <div className={`rounded-3xl p-10 text-center ${cardClass}`}>
            <p className={sub}>Loading properties...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
            {error}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className={`rounded-3xl p-10 text-center ${cardClass}`}>
            <p className={sub}>No property found.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className={`overflow-hidden rounded-[28px] shadow-xl transition hover:-translate-y-1 ${cardClass}`}
              >
                <div className="relative">
                  <img
                    src={getImage(item)}
                    alt={getTitle(item)}
                    className="h-56 w-full object-cover"
                  />

                  <span className="absolute left-4 top-4 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {getType(item)}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className={`text-xl font-bold ${heading}`}>
                    {getTitle(item)}
                  </h3>

                  <p className={`mt-2 text-sm ${softText}`}>
                    {getLocation(item)}
                  </p>

                  <p className={`mt-4 line-clamp-3 text-sm leading-7 ${sub}`}>
                    {getDescription(item)}
                  </p>

                  <div className="mt-5">
                    <span
                      className={`text-lg font-extrabold ${
                        isDark ? "text-blue-300" : "text-blue-700"
                      }`}
                    >
                      {typeof getPrice(item) === "number"
                        ? `NPR ${getPrice(item)}`
                        : getPrice(item)}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <button
                      onClick={() => nav(`/listings/${item.id}`)}
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-3 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02]"
                    >
                      Details
                    </button>

                    <button
                      onClick={() => nav(`/listing/${item.id}/360`)}
                      className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                        isDark
                          ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          : "border border-blue-100 bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      360°
                    </button>

                    <button
                      onClick={() => nav(`/tenant/book/${item.id}`)}
                      className="rounded-2xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}