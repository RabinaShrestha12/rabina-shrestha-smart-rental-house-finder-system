import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/ThemeContext";
import Shell from "../../components/Shell";
import api from "../../api/axios";

const BACKEND = "http://127.0.0.1:8000";

function toImageSrc(value) {
  if (!value) return "/no-image.png";
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/http://") || s.startsWith("/media/https://")) {
    return s.replace(/^\/media\//, "");
  }
  if (s.startsWith("/")) return `${BACKEND}${s}`;
  return `${BACKEND}/${s}`;
}

function safeListing(data) {
  return data?.listing || data?.data || data || null;
}

export default function TenantBookPage() {
  const { listing_id } = useParams();
  const nav = useNavigate();
  const { role, email, isAuthed } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [listing, setListing] = useState(null);
  const [loadingListing, setLoadingListing] = useState(true);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [notice, setNotice] = useState({ type: "info", msg: "" });

  useEffect(() => {
    if (!isAuthed) {
      nav("/auth", { replace: true });
      return;
    }
    if (role !== "tenant") {
      nav("/unauthorized", { replace: true });
    }
  }, [isAuthed, role, nav]);

  useEffect(() => {
    const loadListing = async () => {
      if (!listing_id) return;

      setLoadingListing(true);
      try {
        let data = null;

        try {
          const res = await api.get(`public/listings/${listing_id}/`);
          data = res.data;
        } catch {
          const res = await api.get(`public/listings/${listing_id}`);
          data = res.data;
        }

        setListing(safeListing(data));
      } catch {
        setListing(null);
      } finally {
        setLoadingListing(false);
      }
    };

    if (isAuthed && role === "tenant") {
      loadListing();
    }
  }, [listing_id, isAuthed, role]);

  const getTitle = (x) => x?.title || x?.property_name || x?.name || "Property";
  const getAddress = (x) => x?.address || x?.location || x?.city || x?.area || "—";
  const getRent = (x) => x?.rent ?? x?.price ?? x?.monthly_rent ?? null;
  const getType = (x) => x?.property_type || x?.type || "Property";
  const getDescription = (x) =>
    x?.description || x?.details || x?.about || "No description available.";
  const getImage = (x) =>
    x?.image_url ||
    x?.image ||
    x?.cover ||
    x?.thumbnail ||
    x?.main_image ||
    x?.photo ||
    x?.pano_front_url ||
    x?.front_image ||
    null;

  const ownerName =
    listing?.owner_name || listing?.owner?.name || listing?.owner?.username || "Owner";

  const ownerEmail =
    listing?.owner_email || listing?.owner?.email || "Email not available";

  const ownerPhone =
    listing?.owner_phone || listing?.owner?.phone || "Phone not available";

  const currency = useMemo(() => {
    const n = Number(getRent(listing));
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString();
  }, [listing]);

  const imageSrc = toImageSrc(getImage(listing));

  const sendBookingRequest = async () => {
    const text = String(message || "").trim();

    if (!listing_id) {
      setNotice({ type: "error", msg: "Listing id is missing." });
      return;
    }

    if (!text) {
      setNotice({ type: "error", msg: "Please write a message to the owner." });
      return;
    }

    setSending(true);
    setNotice({ type: "info", msg: "" });

    try {
      const res = await api.post("tenant/booking-requests/create/", {
        listing_id,
        first_message: text,
      });

      const bookingId = res?.data?.id;

      setNotice({
        type: "success",
        msg: bookingId
          ? `Booking request sent successfully. Opening inbox for request #${bookingId}.`
          : "Booking request sent successfully. Opening inbox.",
      });

      setTimeout(() => {
        if (bookingId) nav(`/tenant/inbox?open=${bookingId}`);
        else nav("/tenant/inbox");
      }, 900);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        "Failed to send booking request.";
      setNotice({ type: "error", msg });
    } finally {
      setSending(false);
    }
  };

  const noticeClass =
    notice.type === "success"
      ? isDark
        ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-100"
        : "border-emerald-300 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
      ? isDark
        ? "border-red-400/30 bg-red-500/12 text-red-100"
        : "border-red-300 bg-red-50 text-red-700"
      : isDark
      ? "border-sky-400/20 bg-slate-800/70 text-slate-200"
      : "border-sky-200 bg-sky-50 text-slate-700";

  const topButtonClass = isDark
    ? "rounded-2xl border border-sky-300/15 bg-slate-800/75 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700/90 hover:text-white"
    : "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-slate-900";

  const leftCardClass = isDark
    ? "overflow-hidden rounded-3xl border border-sky-300/12 bg-slate-900/75 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
    : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]";

  const infoCardClass = isDark
    ? "rounded-2xl border border-sky-300/12 bg-slate-800/75 p-4"
    : "rounded-2xl border border-slate-200 bg-slate-50/90 p-4";

  const infoTitleClass = isDark
    ? "text-xs font-semibold uppercase tracking-wide text-sky-200/75"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";

  const infoTextClass = isDark ? "text-slate-300" : "text-slate-600";
  const strongTextClass = isDark ? "text-white" : "text-slate-900";

  const actionButtonClass = isDark
    ? "rounded-2xl border border-sky-300/15 bg-slate-800/75 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-700/90"
    : "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-sky-50";

  const formPanelClass = isDark
    ? "rounded-3xl border border-fuchsia-300/12 bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/10 to-cyan-500/10 p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
    : "rounded-3xl border border-slate-200 bg-gradient-to-br from-fuchsia-50 via-indigo-50 to-cyan-50 p-5 md:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]";

  const badgeClass = isDark
    ? "inline-flex rounded-full border border-fuchsia-300/20 bg-fuchsia-500/12 px-3 py-1 text-xs font-semibold text-fuchsia-100"
    : "inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700";

  const statCardClass = isDark
    ? "rounded-2xl border border-sky-300/12 bg-slate-800/80 p-4"
    : "rounded-2xl border border-slate-200 bg-white/90 p-4";

  const formBoxClass = isDark
    ? "mt-5 rounded-3xl border border-sky-300/12 bg-slate-800/75 p-5"
    : "mt-5 rounded-3xl border border-slate-200 bg-white/95 p-5";

  const textareaClass = isDark
    ? "mt-4 w-full rounded-2xl border border-sky-300/12 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-400/20"
    : "mt-4 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-200";

  const primaryButtonClass = isDark
    ? "rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-60"
    : "rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-fuchsia-400 hover:via-purple-400 hover:to-indigo-400 disabled:opacity-60";

  const secondaryButtonClass = isDark
    ? "rounded-2xl border border-sky-300/15 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/90 disabled:opacity-60"
    : "rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

  const helperBoxClass = isDark
    ? "mt-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4"
    : "mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4";

  const helperTitleClass = isDark ? "text-amber-200" : "text-amber-700";
  const helperTextClass = isDark ? "text-amber-100/90" : "text-amber-700";

  return (
    <Shell
      title="Request Booking"
      subtitle={`Send a booking request for Listing #${listing_id}.`}
      right={
        <div className="flex flex-wrap gap-2">
          <button onClick={() => nav(-1)} className={topButtonClass}>
            ← Back
          </button>

          <button onClick={() => nav("/tenant/inbox")} className={topButtonClass}>
            📩 Inbox
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={leftCardClass}>
          <div className="relative">
            <img
              src={imageSrc}
              alt="listing"
              className="h-64 w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/no-image.png";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {getType(listing)}
                </span>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-50 backdrop-blur">
                  Rs {currency}
                </span>
              </div>

              <div className="mt-3 text-2xl font-black text-white">
                {loadingListing ? "Loading property..." : getTitle(listing)}
              </div>

              <div className="mt-1 text-sm text-slate-200">
                📍 {getAddress(listing)}
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className={infoCardClass}>
                <div className={infoTitleClass}>Owner</div>
                <div className={`mt-2 text-lg font-bold ${strongTextClass}`}>{ownerName}</div>
                <div className={`mt-1 text-sm ${infoTextClass}`}>{ownerEmail}</div>
                <div className={`mt-1 text-sm ${infoTextClass}`}>{ownerPhone}</div>
              </div>

              <div className={infoCardClass}>
                <div className={infoTitleClass}>Booking Tips</div>
                <div className={`mt-2 text-sm leading-6 ${infoTextClass}`}>
                  Introduce yourself, mention your move-in date, budget, number of
                  people, and any questions about availability or visit time.
                </div>
              </div>
            </div>

            <div className={`mt-4 ${infoCardClass}`}>
              <div className={`text-sm font-semibold ${strongTextClass}`}>
                Property Description
              </div>
              <div className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${infoTextClass}`}>
                {loadingListing ? "Loading description..." : getDescription(listing)}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => nav(`/public/listings/${listing_id}`)}
                className={actionButtonClass}
              >
                View Full Details
              </button>

              <button
                onClick={() => nav(`/map?listing=${listing_id}`)}
                className={actionButtonClass}
              >
                🗺️ View on Map
              </button>
            </div>
          </div>
        </div>

        <div className={formPanelClass}>
          <div className={badgeClass}>Booking Form</div>

          <h2 className={`mt-4 text-3xl font-black tracking-tight ${strongTextClass}`}>
            Request this property
          </h2>

          <p className={`mt-2 text-sm leading-6 ${infoTextClass}`}>
            Write a professional message to the owner. Once sent, the request will
            appear in your inbox and you can continue chatting there.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className={statCardClass}>
              <div className={infoTitleClass}>Listing ID</div>
              <div className={`mt-2 text-2xl font-black ${strongTextClass}`}>{listing_id}</div>
            </div>

            <div className={statCardClass}>
              <div className={infoTitleClass}>Tenant</div>
              <div className={`mt-2 text-lg font-bold break-all ${strongTextClass}`}>
                {email || "Tenant"}
              </div>
            </div>
          </div>

          {notice.msg && (
            <div className={`mt-5 rounded-2xl border p-4 text-sm ${noticeClass}`}>
              {notice.msg}
            </div>
          )}

          <div className={formBoxClass}>
            <label className={`block text-sm font-semibold ${strongTextClass}`}>
              Message to Owner
            </label>
            <div className={`mt-1 text-xs ${infoTitleClass}`}>
              A good message increases the chance of getting a response.
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className={textareaClass}
              placeholder="Example: Hi, I am a student/worker. I am interested in this property and would like to know if it is still available. My expected move-in date is..., my budget is..., and there will be ... people."
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={sendBookingRequest}
                disabled={sending}
                className={primaryButtonClass}
              >
                {sending ? "Sending..." : "Send Booking Request"}
              </button>

              <button
                onClick={() => setMessage("")}
                disabled={sending}
                className={secondaryButtonClass}
              >
                Clear
              </button>
            </div>
          </div>

          <div className={helperBoxClass}>
            <div className={`text-sm font-semibold ${helperTitleClass}`}>
              Helpful message ideas
            </div>
            <ul className={`mt-2 space-y-1 text-sm ${helperTextClass}`}>
              <li>• Introduce yourself clearly</li>
              <li>• Mention move-in date</li>
              <li>• Mention your budget</li>
              <li>• Ask if visit/inspection is available</li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}