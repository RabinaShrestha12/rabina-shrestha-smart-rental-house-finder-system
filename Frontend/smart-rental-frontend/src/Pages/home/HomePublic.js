import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import {
  Search,
  MapPin,
  Building,
  Star,
  ShieldCheck,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value)
    return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800";
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

export default function HomePublic() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [featuredListings, setFeaturedListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [qLocation, setQLocation] = useState("");
  const [qType, setQType] = useState("all");

  const isDark = theme === "dark";

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get("/public/listings/");
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const topListings = data.slice(0, 3);
        setFeaturedListings(topListings);

        if (topListings.length > 0) {
          try {
            const reviewPromises = topListings.map(async (listing) => {
              try {
                const reviewRes = await api.get(`listings/${listing.id}/reviews/`);
                const listingReviews = Array.isArray(reviewRes.data)
                  ? reviewRes.data
                  : reviewRes.data?.results || [];

                return listingReviews.map((review) => ({
                  ...review,
                  listing_id: listing.id,
                  listing_title: listing.title,
                }));
              } catch (err) {
                console.log(`Error fetching reviews for listing ${listing.id}`, err);
                return [];
              }
            });

            const reviewResults = await Promise.all(reviewPromises);

            const allReviews = reviewResults
              .flat()
              .filter((review) => Number(review.rating || 0) > 3)
              .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
              .slice(0, 6);

            setReviews(allReviews);
          } catch (rErr) {
            console.log("Error fetching reviews", rErr);
            setReviews([]);
          }
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.error("Error fetching listings", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSearch = () => {
    nav(
      `/listings?location=${encodeURIComponent(
        qLocation
      )}&type=${encodeURIComponent(qType)}`
    );
  };

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#071120] text-white" : "bg-[#eef6ff] text-neutral-900"
      }`}
    >
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden pt-32 pb-40 md:pt-48 md:pb-52">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000"
            alt="Smart Rental Home"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-transparent"></div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-12">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <Star className="h-3.5 w-3.5 fill-blue-300" /> Smart Rental Platform
            </div>

            <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-7xl">
              Discover Your <br className="hidden md:block" />
              <span className="text-blue-400">Perfect Home</span> Today.
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-neutral-300 md:text-xl">
              Smart Rental helps you find rooms, apartments, and houses more
              easily with modern search, trusted listings, and features tailored
              to your location, budget, and lifestyle.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/listings"
                className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30"
              >
                Explore Listings
              </Link>

              <button
                onClick={() => {
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Search Bar */}
      <section className="relative z-20 mx-auto -mt-24 max-w-5xl px-6 md:-mt-16">
        <div
          className={`flex flex-col gap-4 rounded-3xl p-4 shadow-2xl md:flex-row md:p-6 ${
            isDark
              ? "border border-white/10 bg-[#0b1b33] shadow-black/30"
              : "border border-[#dbeafe] bg-[#f8fbff] shadow-blue-100/50"
          }`}
        >
          <div
            className={`flex flex-1 items-center gap-3 rounded-2xl p-4 transition-colors ${
              isDark
                ? "border border-white/10 bg-[#10233f]"
                : "border border-[#dbeafe] bg-[#edf6ff]"
            }`}
          >
            <MapPin className="h-6 w-6 shrink-0 text-blue-500" />
            <div className="flex w-full flex-1 flex-col">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Location
              </span>
              <input
                type="text"
                placeholder="Where do you want to live?"
                value={qLocation}
                onChange={(e) => setQLocation(e.target.value)}
                className={`w-full border-none bg-transparent font-medium outline-none ${
                  isDark
                    ? "text-white placeholder:text-slate-400"
                    : "text-neutral-900 placeholder:text-slate-400"
                }`}
              />
            </div>
          </div>

          <div
            className={`flex flex-1 items-center gap-3 rounded-2xl p-4 transition-colors ${
              isDark
                ? "border border-white/10 bg-[#10233f]"
                : "border border-[#dbeafe] bg-[#edf6ff]"
            }`}
          >
            <Building className="h-6 w-6 shrink-0 text-blue-500" />
            <div className="flex w-full flex-1 flex-col">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Property Type
              </span>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value)}
                className={`w-full cursor-pointer appearance-none border-none bg-transparent font-medium outline-none ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                <option value="all">All Types</option>
                <option value="room">Room</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 md:w-auto"
          >
            <Search className="h-5 w-5" />
            Search
          </button>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h2
              className={`mb-4 text-4xl font-extrabold tracking-tight ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              Featured <span className="text-blue-600">Properties</span>
            </h2>
            <p className={`text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Browse our handpicked selection of rental properties, updated daily.
            </p>
          </div>

          <Link
            to="/listings"
            className="flex items-center gap-1 font-semibold text-blue-600 transition-all hover:gap-2"
          >
            View All Properties <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-[400px] animate-pulse rounded-3xl ${
                  isDark ? "bg-[#10233f]" : "bg-[#dbeafe]"
                }`}
              ></div>
            ))}
          </div>
        ) : featuredListings.length === 0 ? (
          <div
            className={`rounded-3xl py-20 text-center ${
              isDark
                ? "border border-white/10 bg-[#0b1b33]"
                : "border border-[#dbeafe] bg-[#f4f9ff]"
            }`}
          >
            <p className={`text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              No properties found at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((l) => (
              <div
                key={l.id}
                className={`group flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:shadow-xl ${
                  isDark
                    ? "border border-white/10 bg-[#0b1b33] shadow-black/20"
                    : "border border-[#dbeafe] bg-[#f8fbff] shadow-sm shadow-blue-100/40"
                }`}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={toImageSrc(l.image_url || l.image || l.pano_front_url)}
                    alt={l.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 backdrop-blur">
                      {l.property_type || "Rental"}
                    </span>
                    {(l.is_available === false || l.status === "booked") && (
                      <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
                        Booked
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div
                    className={`mb-3 flex items-center gap-1 text-sm ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    <MapPin className="h-4 w-4 text-blue-500" />
                    {l.location || "Location not specified"}
                  </div>

                  <h3
                    className={`mb-2 line-clamp-1 text-2xl font-bold transition-colors group-hover:text-blue-400 ${
                      isDark ? "text-white" : "text-neutral-900 group-hover:text-blue-600"
                    }`}
                  >
                    {l.title}
                  </h3>

                  <p
                    className={`mb-6 line-clamp-2 flex-1 text-sm ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {l.description ||
                      "A beautiful rental property available now. Contact us for more details."}
                  </p>

                  <div
                    className={`flex items-center justify-between pt-4 ${
                      isDark ? "border-t border-white/10" : "border-t border-[#dbeafe]"
                    }`}
                  >
                    <div>
                      <span className="text-2xl font-extrabold text-blue-600">
                        ${l.price_per_month || l.price_per_week * 4 || 0}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {" "}
                        /mo
                      </span>
                    </div>

                    <button
                      onClick={() => nav(`/listings/${l.id}`)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                        isDark
                          ? "bg-[#10233f] text-slate-200 group-hover:bg-blue-600 group-hover:text-white"
                          : "bg-[#eaf4ff] text-neutral-600 group-hover:bg-blue-600 group-hover:text-white"
                      }`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Us / Features */}
      <section
        id="features"
        className={`relative overflow-hidden py-24 md:py-32 ${
          isDark ? "bg-[#08182f] text-white" : "bg-neutral-900 text-white"
        }`}
      >
        <div className="pointer-events-none absolute top-0 right-0 -mt-40 -mr-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen"></div>
        <div className="pointer-events-none absolute bottom-0 left-0 -mb-40 -ml-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl mix-blend-screen"></div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
          <div className="mx-auto mb-20 max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl">
              Why Choose{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Smart Rental?
              </span>
            </h2>
            <p className="text-lg text-neutral-300">
              We provide a seamless, secure, and modern experience for tenants,
              property owners, and service providers with smart features built
              for your FYP platform.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <ShieldCheck className="h-8 w-8" />,
                title: "Verified Listings",
                text: "Every property is reviewed to help users explore more trusted and reliable rental options.",
              },
              {
                icon: <Search className="h-8 w-8" />,
                title: "Smart Search AI",
                text: "Find rooms, apartments, and houses faster with search tools matched to location, budget, and preferences.",
              },
              {
                icon: <Star className="h-8 w-8" />,
                title: "360° Virtual Tours",
                text: "Explore properties digitally before visiting and make better rental decisions with less effort.",
              },
              {
                icon: <Clock className="h-8 w-8" />,
                title: "24/7 Support",
                text: "Maintenance requests and communication tools help keep tenants and owners connected anytime.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur transition-colors hover:bg-white/10"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                  {item.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2
            className={`mb-4 text-4xl font-extrabold tracking-tight ${
              isDark ? "text-white" : "text-neutral-900"
            }`}
          >
            What Our <span className="text-blue-600">Users Say</span>
          </h2>
          <p className={`text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Real feedback from tenants who gave highly rated reviews on Smart
            Rental.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div
            className={`rounded-3xl py-20 text-center ${
              isDark
                ? "border border-white/10 bg-[#0b1b33]"
                : "border border-[#dbeafe] bg-[#f4f9ff]"
            }`}
          >
            <p className={`text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              No tenant reviews above 3 stars are available right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => {
              const reviewerName =
                r.tenant_username ||
                r.tenant_name ||
                r.user_name ||
                r.username ||
                "Anonymous Tenant";

              const reviewText =
                r.comment ||
                r.review ||
                r.review_text ||
                r.message ||
                "Great rental experience.";

              const rating = Number(r.rating || 0);

              return (
                <div
                  key={r.id || `${r.listing_id}-${i}`}
                  className={`rounded-3xl p-8 transition-transform hover:-translate-y-1 ${
                    isDark
                      ? "border border-white/10 bg-[#0b1b33] shadow-xl shadow-black/20"
                      : "border border-[#dbeafe] bg-[#f8fbff] shadow-xl shadow-blue-100/40"
                  }`}
                >
                  <div className="mb-4 flex gap-1 text-orange-400">
                    {Array.from({ length: rating }).map((_, i2) => (
                      <Star key={i2} className="h-5 w-5 fill-current" />
                    ))}
                  </div>

                  <p
                    className={`mb-6 min-h-[84px] italic ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    "{reviewText}"
                  </p>

                  <div
                    className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
                      isDark ? "bg-[#10233f] text-slate-300" : "bg-[#edf6ff] text-slate-600"
                    }`}
                  >
                    <span className="font-semibold">Property:</span>{" "}
                    {r.listing_title || "Rental Property"}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                      {reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className={`font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
                        {reviewerName}
                      </h4>
                      <span className="mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Verified Review
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-24 md:px-12">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-center shadow-2xl shadow-blue-500/20 md:p-20">
          <div className="absolute top-0 left-0 h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Ready to find your next rental?
            </h2>
            <p className="mb-10 text-xl text-blue-100">
              Join Smart Rental and explore modern rooms, apartments, and houses
              with features designed for a better rental experience.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={() => nav("/auth")}
                className="w-full rounded-2xl bg-white px-8 py-4 font-bold text-blue-700 shadow-xl transition-all hover:scale-105 hover:shadow-2xl sm:w-auto"
              >
                Sign Up Now
              </button>

              <button
                onClick={() => nav("/listings")}
                className="w-full rounded-2xl border border-white/20 bg-blue-800/40 px-8 py-4 font-bold text-white transition-all hover:bg-white/10 sm:w-auto"
              >
                Browse Properties
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}