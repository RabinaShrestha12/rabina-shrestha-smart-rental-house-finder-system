import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../api/axios";

export default function TenantEsewaPay() {
  const nav = useNavigate();
  const { bookingId } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [listingId, setListingId] = useState(
    location.state?.listingId ? String(location.state.listingId) : ""
  );
  const [amount, setAmount] = useState(
    location.state?.amount !== undefined &&
      location.state?.amount !== null &&
      String(location.state.amount).trim() !== ""
      ? String(location.state.amount)
      : ""
  );
  const [paymentMonth, setPaymentMonth] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const getBookingId = (b) => b?.id ?? b?.booking_id ?? b?.pk ?? null;

  const getListingId = (b) =>
    b?.listing_id ??
    b?.listing?.id ??
    b?.listing?.pk ??
    b?.property_id ??
    b?.property?.id ??
    null;

  const getListingTitle = (b) =>
    b?.listing_title ||
    b?.listing?.title ||
    b?.property_title ||
    b?.property?.title ||
    "Property";

  const getOwnerName = (b) =>
    b?.owner_name ||
    b?.owner?.name ||
    b?.listing?.owner?.name ||
    "Owner";

  const getStatus = (b) =>
    String(
      b?.status ??
        b?.state ??
        b?.booking_status ??
        b?.request_status ??
        "pending"
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const getAmount = (b) => {
    const raw =
      b?.payment_amount ??
      b?.amount ??
      b?.total_amount ??
      b?.rent_amount ??
      b?.advance_amount ??
      b?.booking_amount ??
      b?.monthly_rent ??
      b?.listing_rent ??
      b?.listing_price ??
      b?.price ??
      b?.rent ??
      b?.listing?.rent ??
      b?.listing?.price ??
      b?.listing?.amount ??
      b?.listing?.monthly_rent ??
      b?.property?.rent ??
      b?.property?.price ??
      b?.property?.amount ??
      "";

    if (raw === null || raw === undefined) return "";
    return String(raw).trim();
  };

  const canPay = useMemo(() => {
    const status = getStatus(booking);
    return [
      "accepted",
      "approved",
      "confirmed",
      "payment_pending",
      "awaiting_payment",
      "pending_payment",
      "booked",
    ].includes(status);
  }, [booking]);

  useEffect(() => {
    const loadBooking = async () => {
      if (!bookingId) {
        setPageLoading(false);
        return;
      }

      try {
        const res = await api.get("tenant/booking-requests/");
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
          ? res.data.results
          : [];

        const found = list.find(
          (item) => String(getBookingId(item)) === String(bookingId)
        );

        if (!found) {
          alert("Booking not found.");
          nav(-1);
          return;
        }

        setBooking(found);

        const autoListingId = getListingId(found);
        const autoAmount = getAmount(found);

        if (autoListingId !== null && autoListingId !== undefined) {
          setListingId(String(autoListingId));
        }

        if (autoAmount !== "") {
          setAmount(String(autoAmount));
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load booking details.");
      } finally {
        setPageLoading(false);
      }
    };

    loadBooking();
  }, [bookingId, nav]);

  const handlePay = async (e) => {
    e.preventDefault();

    if (!bookingId) {
      alert("Booking id is missing.");
      return;
    }

    if (!listingId) {
      alert("Listing id is missing for this booking.");
      return;
    }

    if (!amount) {
      alert("Amount is missing. Please enter the amount.");
      return;
    }

    if (!canPay) {
      alert("This booking is not ready for payment yet.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        listing_id: listingId,
        amount,
        payment_month: paymentMonth,
        booking_id: bookingId,
      };

      const res = await api.post("/payments/esewa/initiate/", payload);

      const { payment_url, form_fields } = res.data;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = payment_url;

      Object.entries(form_fields || {}).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value ?? "";
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to start eSewa payment.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="text-lg font-semibold text-gray-800">
          Loading payment details...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pay Booking with eSewa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete your payment for the accepted booking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => nav(-1)}
          className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Back
        </button>
      </div>

      {booking && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-800 mb-2">
            Booking Summary
          </div>

          <div className="space-y-1 text-sm text-gray-700">
            <div>
              <span className="font-medium">Booking ID:</span> {bookingId}
            </div>
            <div>
              <span className="font-medium">Property:</span>{" "}
              {getListingTitle(booking)}
            </div>
            <div>
              <span className="font-medium">Owner:</span> {getOwnerName(booking)}
            </div>
            <div>
              <span className="font-medium">Status:</span>{" "}
              {getStatus(booking).replace(/_/g, " ")}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Listing ID
          </label>
          <input
            type="text"
            value={listingId}
            readOnly
            className="w-full border rounded-xl p-3 bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full border rounded-xl p-3 bg-white text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Month (optional)
          </label>
          <input
            type="text"
            placeholder="Example: March 2026"
            value={paymentMonth}
            onChange={(e) => setPaymentMonth(e.target.value)}
            className="w-full border rounded-xl p-3"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !listingId || !amount || !canPay}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl"
        >
          {loading ? "Processing..." : "Pay with eSewa"}
        </button>
      </form>
    </div>
  );
}