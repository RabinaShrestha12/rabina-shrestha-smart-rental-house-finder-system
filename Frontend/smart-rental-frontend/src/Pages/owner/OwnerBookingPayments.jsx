import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function OwnerBookingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const res = await api.get("/owner/booking-payments/");
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  if (loading) return <div className="p-6">Loading owner booking payments...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Owner Booking Payments</h1>

      <div className="grid gap-5">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow p-5">
            <div className="space-y-2">
              <p><strong>Tenant:</strong> {p.tenant_name}</p>
              <p><strong>Listing:</strong> {p.listing_title}</p>
              <p><strong>Total Amount:</strong> {p.amount}</p>
              <p><strong>Your Share:</strong> {p.owner_share_amount}</p>
              <p><strong>Payment Status:</strong> {p.payment_status}</p>
              <p><strong>Payout Status:</strong> {p.owner_payout_status}</p>
              <p><strong>Payout Date:</strong> {p.owner_payout_date || "-"}</p>
              <p><strong>Note:</strong> {p.owner_payout_note || "-"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}