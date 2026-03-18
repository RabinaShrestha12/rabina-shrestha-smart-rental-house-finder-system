import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const nav = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 shadow-md">
        <h1 className="text-5xl font-extrabold text-center text-green-600">
          Payment Successful
        </h1>

        <p className="mt-5 text-center text-gray-700 text-2xl">
          Your booking payment has been completed successfully.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-100"
          >
            Go Back
          </button>

          <button
            type="button"
            onClick={() => nav("/tenant")}
            className="rounded-xl bg-green-600 px-6 py-3 text-lg font-semibold text-white hover:bg-green-700"
          >
            Go to Dashboard
          </button>

          <button
            type="button"
            onClick={() => nav("/tenant/booking-payments")}
            className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700"
          >
            Payment History
          </button>
        </div>
      </div>
    </div>
  );
}