// src/pages/project-workspace/TestPayment.jsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/api/axios";

export default function TestPayment() {
  const { projectId } = useParams();

  const [amount, setAmount] = useState("");
  const [gateway, setGateway] = useState("razorpay");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid amount");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        projectId,
        gateway,
        amount: Number(amount),
        currency: "INR",
        customer: {
          name: "Test User",
          email: "test@example.com",
          phone: "9999999999",
        },
      };

      console.log("🧪 Initiating payment:", payload);

      const res = await api.post("/api/payments/initiate", payload);

      /* ===============================
         RAZORPAY FLOW (NO REDIRECT)
      =============================== */
      if (gateway === "razorpay") {
        const { razorpayOrderId, key, transactionId } = res.data?.data || {};

        if (!razorpayOrderId || !key || !transactionId) {
          throw new Error("Incomplete Razorpay init data from backend");
        }

        const options = {
          key,
          amount: Number(amount) * 100, // paise
          currency: "INR",
          name: "UniPay Test",
          description: "Test Transaction",
          order_id: razorpayOrderId,

          handler: async function (response) {
            try {
              await api.post("/api/payments/callback/razorpay", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transactionId,
              });

              alert("✅ Payment successful");
              window.location.reload();
            } catch (err) {
              console.error("❌ Verification failed:", err);
              alert("Payment verification failed");
            }
          },

          prefill: {
            name: "Test User",
            email: "test@example.com",
            contact: "9999999999",
          },

          theme: { color: "#000000" },

          modal: {
            ondismiss: function () {
              console.log("Razorpay popup closed");
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        return;
      }

      /* ===============================
         OTHER GATEWAYS (FALLBACK)
      =============================== */
      alert("Payment initiated. Follow gateway instructions.");
    } catch (err) {
      console.error("❌ Payment error:", err);
      alert(err.response?.data?.message || err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md bg-white p-6 rounded-xl border shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Test Payment</h1>

      <div className="space-y-4">
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <select
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="razorpay">Razorpay</option>
          <option value="payu">PayU</option>
          <option value="paypal">PayPal</option>
          <option value="cashfree">Cashfree</option>
        </select>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 disabled:opacity-60"
        >
          {loading ? "Processing..." : "Pay"}
        </button>
      </div>
    </div>
  );
}
