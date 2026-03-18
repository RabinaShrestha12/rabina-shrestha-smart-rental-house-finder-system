import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function TenantEsewaPay() {
  const nav = useNavigate();

  const [listingId, setListingId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMonth, setPaymentMonth] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/payments/esewa/initiate/", {
        listing_id: listingId,
        amount,
        payment_month: paymentMonth,
      });

      const { payment_url, form_fields } = res.data;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = payment_url;

      Object.entries(form_fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
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

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pay Booking with eSewa</h1>

        <button
          type="button"
          onClick={() => nav(-1)}
          className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Back
        </button>
      </div>

      <form onSubmit={handlePay} className="space-y-4">
        <input
          type="number"
          placeholder="Listing ID"
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className="w-full border rounded-xl p-3"
        />

        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded-xl p-3"
        />

        <input
          type="text"
          placeholder="Payment Month (optional)"
          value={paymentMonth}
          onChange={(e) => setPaymentMonth(e.target.value)}
          className="w-full border rounded-xl p-3"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
        >
          {loading ? "Processing..." : "Pay with eSewa"}
        </button>
      </form>
    </div>
  );
}