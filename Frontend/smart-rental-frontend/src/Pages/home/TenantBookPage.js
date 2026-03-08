import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
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
      ? "border-green-500/20 bg-green-500/10 text-green-200"
      : notice.type === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : "border-white/10 bg-white/5 text-slate-200";

  return (
    <Shell
      title="Request Booking"
      subtitle={`Send a booking request for Listing #${listing_id}.`}
      right={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => nav(-1)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            ← Back
          </button>

          <button
            onClick={() => nav("/tenant/inbox")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            📩 Inbox
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
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
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {getType(listing)}
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-100 backdrop-blur">
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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Owner
                </div>
                <div className="mt-2 text-lg font-bold text-white">{ownerName}</div>
                <div className="mt-1 text-sm text-slate-300">{ownerEmail}</div>
                <div className="mt-1 text-sm text-slate-300">{ownerPhone}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Booking Tips
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Introduce yourself, mention your move-in date, budget, number of
                  people, and any questions about availability or visit time.
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Property Description</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {loadingListing ? "Loading description..." : getDescription(listing)}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => nav(`/public/listings/${listing_id}`)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                View Full Details
              </button>

              <button
                onClick={() => nav(`/map?listing=${listing_id}`)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                🗺️ View on Map
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-cyan-500/10 p-5 md:p-6">
          <div className="inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
            Booking Form
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-white">
            Request this property
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Write a professional message to the owner. Once sent, the request will
            appear in your inbox and you can continue chatting there.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Listing ID
              </div>
              <div className="mt-2 text-2xl font-black text-white">{listing_id}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Tenant
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                {email || "Tenant"}
              </div>
            </div>
          </div>

          {notice.msg && (
            <div className={`mt-5 rounded-2xl border p-4 text-sm ${noticeClass}`}>
              {notice.msg}
            </div>
          )}

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
            <label className="block text-sm font-semibold text-white">
              Message to Owner
            </label>
            <div className="mt-1 text-xs text-slate-400">
              A good message increases the chance of getting a response.
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/40"
              placeholder="Example: Hi, I am a student/worker. I am interested in this property and would like to know if it is still available. My expected move-in date is..., my budget is..., and there will be ... people."
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={sendBookingRequest}
                disabled={sending}
                className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send Booking Request"}
              </button>

              <button
                onClick={() => setMessage("")}
                disabled={sending}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="text-sm font-semibold text-amber-200">
              Helpful message ideas
            </div>
            <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
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