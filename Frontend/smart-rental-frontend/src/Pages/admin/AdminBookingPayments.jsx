import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminBookingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteMap, setNoteMap] = useState({});

  const fetchPayments = async () => {
    try {
      const res = await api.get("/admin/booking-payments/");
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

  const markOwnerPaid = async (id) => {
    try {
      await api.patch(`/admin/booking-payments/${id}/owner-paid/`, {
        owner_payout_note: noteMap[id] || "Owner paid by admin",
      });
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert("Failed to mark owner payout.");
    }
  };

  if (loading) return <div className="p-6">Loading booking payments...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Booking Payments</h1>

      <div className="grid gap-6">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow p-5">
            <div className="space-y-2">
              <p><strong>Tenant:</strong> {p.tenant_name}</p>
              <p><strong>Owner:</strong> {p.owner_name}</p>
              <p><strong>Listing:</strong> {p.listing_title}</p>
              <p><strong>Total Amount:</strong> {p.amount}</p>
              <p><strong>Admin Share:</strong> {p.admin_share_amount} ({p.admin_share_percent}%)</p>
              <p><strong>Owner Share:</strong> {p.owner_share_amount} ({p.owner_share_percent}%)</p>
              <p><strong>Payment Status:</strong> {p.payment_status}</p>
              <p><strong>Owner Payout Status:</strong> {p.owner_payout_status}</p>
              <p><strong>Transaction UUID:</strong> {p.transaction_uuid}</p>
              <p><strong>Ref ID:</strong> {p.ref_id || "-"}</p>
            </div>

            {p.payment_status === "COMPLETE" && p.owner_payout_status !== "paid" && (
              <div className="mt-4 space-y-3">
                <textarea
                  className="w-full border rounded-xl p-3"
                  rows="2"
                  placeholder="Owner payout note"
                  value={noteMap[p.id] || ""}
                  onChange={(e) =>
                    setNoteMap((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
                <button
                  onClick={() => markOwnerPaid(p.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
                >
                  Mark Owner Paid
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}