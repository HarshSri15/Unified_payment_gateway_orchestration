// frontend/src/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const txnid = params.get("txnid");

  useEffect(() => {
    console.log('=== PaymentSuccess Debug ===');
    console.log('All URL params:', params.toString());
    console.log('Extracted txnid:', txnid);
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);

    // If no txnid, just stop loading
    if (!txnid) {
      console.log('ℹ️ No txnid found in URL - showing generic success');
      setLoading(false);
      return;
    }

    async function fetchTransaction() {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/api/payments/transaction/${txnid}`;
        console.log('📡 Fetching from:', url);
        
        const res = await axios.get(url, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        console.log('✅ Response received:', res.data);
        
        setTransaction(res.data.transaction);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching transaction:", err);
        console.error("Error response:", err.response?.data);
        console.error("Error status:", err.response?.status);
        
        setTransaction(null);
        setError(err.response?.data?.message || err.message || 'Failed to fetch transaction');
      } finally {
        setLoading(false);
      }
    }

    fetchTransaction();
  }, [txnid, params]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-xl mx-auto mt-24 p-6 bg-white shadow rounded">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3">Loading payment details...</span>
        </div>
      </div>
    );
  }

  // No transaction ID - Generic success (Cashfree case)
  if (!txnid) {
    return (
      <div className="max-w-xl mx-auto mt-24 p-6 bg-white shadow rounded">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-600">Payment Successful!</h1>
          
          <p className="mt-6 text-lg text-gray-700">
            Your payment has been processed successfully.
          </p>
          
          <p className="mt-2 text-gray-600">
            Please check your dashboard for transaction details.
          </p>

          <div className="flex gap-3 mt-8 justify-center">
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              View Dashboard
            </button>
            <button
              onClick={() => (window.location.href = "/payments")}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
            >
              Make Another Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Transaction not found or error
  if (!transaction) {
    return (
      <div className="max-w-xl mx-auto mt-24 p-6 bg-white shadow rounded">
        <h1 className="text-2xl font-bold text-red-600">Payment Not Found</h1>
        <p className="mt-4">We could not verify your payment.</p>
        
        <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
          <p><strong>Debug Info:</strong></p>
          <p className="mt-2">Transaction ID: {txnid || 'Not found'}</p>
          <p>Error: {error || 'Unknown error'}</p>
          <p className="mt-2 text-xs text-gray-600">Check the browser console for more details</p>
        </div>

        <button
          onClick={() => (window.location.href = "/payments")}
          className="mt-6 px-5 py-2 bg-gray-600 text-white rounded"
        >
          Back to Payments
        </button>
      </div>
    );
  }

  // Success with transaction details (PayU/Razorpay case)
  return (
    <div className="max-w-xl mx-auto mt-24 p-6 bg-white shadow rounded">
      <div className="text-center text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-green-600 text-center">Payment Successful!</h1>

      <div className="mt-6 space-y-3 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium text-gray-700">Status:</span>
          <span className="text-green-600 uppercase font-semibold">{transaction.status}</span>
        </div>
        
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium text-gray-700">Amount:</span>
          <span className="text-xl font-bold text-gray-900">₹{transaction.amount}</span>
        </div>
        
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium text-gray-700">Order ID:</span>
          <span className="text-sm text-gray-600 font-mono">{transaction.gatewayOrderId}</span>
        </div>
        
        {transaction.gatewayPaymentId && (
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium text-gray-700">Payment ID:</span>
            <span className="text-sm text-gray-600 font-mono">{transaction.gatewayPaymentId}</span>
          </div>
        )}

        {transaction.paymentInfo?.product && (
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium text-gray-700">Product:</span>
            <span className="text-gray-900">{transaction.paymentInfo.product}</span>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <span className="font-medium text-gray-700">Date:</span>
          <span className="text-sm text-gray-600">
            {transaction.verifiedAt 
              ? new Date(transaction.verifiedAt).toLocaleString() 
              : new Date(transaction.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
        >
          View Dashboard
        </button>
        <button
          onClick={() => (window.location.href = "/payments")}
          className="flex-1 px-5 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
        >
          New Payment
        </button>
      </div>
    </div>
  );
}