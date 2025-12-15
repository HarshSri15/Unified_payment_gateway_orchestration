// // frontend/src/pages/Payments.jsx
// import { useState, useEffect } from "react";
// import api from "@/api/axios";
// import { useAuth } from "@/context/useAuth";

// export default function Payments() {
//   const { user } = useAuth();

//   const [gateway, setGateway] = useState("payu");
//   const [amount, setAmount] = useState("");
//   const [description, setDescription] = useState("");
//   const [loading, setLoading] = useState(false);

//   const API_BASE = import.meta.env.VITE_API_BASE_URL;
//   const FRONTEND_BASE = window.location.origin;

//   // Load Razorpay SDK on component mount
//   useEffect(() => {
//     const existing = document.querySelector("#razorpay-sdk");
//     if (existing) return;

//     const script = document.createElement("script");
//     script.id = "razorpay-sdk";
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;
//     document.body.appendChild(script);
//   }, []);

//   const handlePayment = async (e) => {
//     e.preventDefault();
//     if (!amount) return alert("Enter amount");

//     try {
//       setLoading(true);

//       // Generate unique transaction ID
//       const transactionId = `TXN_${Date.now()}_${Math.random()
//         .toString(36)
//         .substr(2, 9)}`;

//       const payload = {
//         gateway,
//         amount: parseFloat(amount),
//         currency: "INR",
//         transactionId,
//         userId: user?._id || user?.id,
//         customer: {
//           name: user?.name || "Guest User",
//           email: user?.email || "guest@example.com",
//           phone: user?.phone || "N/A",
//         },
//         redirect: {
//           successUrl: `${FRONTEND_BASE}/payments/success`,
//           failureUrl: `${FRONTEND_BASE}/payments/failure`,
//           notifyUrl: `${API_BASE}/api/payments/callback/${gateway}`,
//         },
//         meta: {
//           description: description || "Payment",
//           linkPurpose: "ORDER_PAYMENT",
//           linkTitle: description || "Payment",
//         },
//       };

//       console.log("🚀 Initiating payment with payload:", payload);

//       const res = await api.post("/api/payments/initiate", payload);
//       const response = res.data?.data || res.data;

//       console.log("✅ Payment initiate response:", response);

//       // ========================================
//       // RAZORPAY - JavaScript Popup
//       // ========================================
//       if (response.paymentMethod === "razorpay_js") {
//         if (!window.Razorpay) {
//           alert("Razorpay SDK not loaded. Please refresh the page.");
//           setLoading(false);
//           return;
//         }

//         // Store the MongoDB transaction ID for error handling
//         const mongoTransactionId = response.transactionId;

//         const options = {
//           key: response.key,
//           amount: response.amount,
//           currency: response.currency || "INR",
//           name: "UnifiedPay",
//           description: description || "Payment",
//           order_id: response.orderId,
          
//           // SUCCESS HANDLER - Called when payment succeeds
//           handler: async function (razorpayResponse) {
//             console.log("💳 Razorpay payment success:", razorpayResponse);
            
//             try {
//               // Send verification to backend
//               const verifyPayload = {
//                 razorpay_order_id: razorpayResponse.razorpay_order_id,
//                 razorpay_payment_id: razorpayResponse.razorpay_payment_id,
//                 razorpay_signature: razorpayResponse.razorpay_signature,
//                 transactionId: response.transactionId, // MongoDB transaction ID
//               };

//               console.log("🔐 Verifying payment with backend:", verifyPayload);

//               const verifyRes = await api.post(
//                 `/api/payments/callback/razorpay`,
//                 verifyPayload,
//                 {
//                   headers: {
//                     'ngrok-skip-browser-warning': 'true'
//                   }
//                 }
//               );

//               console.log("✅ Verification response:", verifyRes.data);

//               // Redirect to success page
//               const txnId = verifyRes.data?.data?.transactionId || response.transactionId;
//               window.location.href = `${FRONTEND_BASE}/payments/success?txnid=${txnId}&status=paid`;
//             } catch (verifyError) {
//               console.error("❌ Verification failed:", verifyError);
//               alert("Payment verification failed. Please contact support.");
//               // Use MongoDB transaction ID
//               window.location.href = `${FRONTEND_BASE}/payments/failure?txnid=${mongoTransactionId}`;
//             }
//           },
          
//           prefill: response.prefill || {
//             name: user?.name || "Guest User",
//             email: user?.email || "guest@example.com",
//             contact: user?.phone || "N/A",
//           },
          
//           theme: { 
//             color: "#3399cc" 
//           },
          
//           // MODAL CLOSE HANDLER - Called when user closes popup
//           modal: {
//             ondismiss: function() {
//               console.log("⚠️ User closed Razorpay popup");
//               setLoading(false);
//             }
//           }
//         };

//         const razorpayInstance = new window.Razorpay(options);
        
//         // Handle payment failures
//         razorpayInstance.on('payment.failed', function (response) {
//           console.error("❌ Razorpay payment failed:", response.error);
//           alert(`Payment failed: ${response.error.description}`);
//           // Use MongoDB transaction ID from backend response
//           window.location.href = `${FRONTEND_BASE}/payments/failure?txnid=${response.transactionId}`;
//         });

//         razorpayInstance.open();
//         return;
//       }

//       // ========================================
//       // CASHFREE - Redirect or JS SDK
//       // ========================================
//       if (response.paymentMethod === "cashfree_js" || response.paymentMethod === "redirect_url") {
//         if (response.redirectUrl) {
//           console.log("🔄 Redirecting to Cashfree:", response.redirectUrl);
//           window.location.href = response.redirectUrl;
//           return;
//         }
//       }

//       // ========================================
//       // PAYTM - JavaScript SDK
//       // ========================================
//       if (response.paymentMethod === "paytm_js") {
//         const script = document.createElement("script");
//         script.src = `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${response.mid}.js`;
//         script.async = true;

//         script.onload = function () {
//           const config = {
//             root: "",
//             flow: "DEFAULT",
//             data: {
//               orderId: response.orderId,
//               token: response.txnToken,
//               tokenType: "TXN_TOKEN",
//               amount: response.amount,
//             },
//             handler: {
//               notifyMerchant: function(eventName, data) {
//                 console.log("Paytm notify:", eventName, data);
//               }
//             }
//           };

//           window.Paytm.CheckoutJS.init(config)
//             .then(() => {
//               console.log("✅ Paytm checkout initialized");
//               window.Paytm.CheckoutJS.invoke();
//             })
//             .catch((error) => {
//               console.error("❌ Paytm error:", error);
//               setLoading(false);
//             });
//         };

//         script.onerror = function() {
//           console.error("❌ Failed to load Paytm SDK");
//           alert("Failed to load Paytm. Please try again.");
//           setLoading(false);
//         };

//         document.body.appendChild(script);
//         return;
//       }

//       // ========================================
//       // PAYU / PAYPAL - Form Redirect
//       // ========================================
//       if (
//         response.paymentMethod === "redirect_form" &&
//         response.redirectUrl &&
//         response.formData
//       ) {
//         console.log("📝 Creating form redirect to:", response.redirectUrl);
        
//         const form = document.createElement("form");
//         form.method = "POST";
//         form.action = response.redirectUrl;

//         Object.entries(response.formData).forEach(([key, value]) => {
//           const input = document.createElement("input");
//           input.type = "hidden";
//           input.name = key;
//           input.value = value;
//           form.appendChild(input);
//         });

//         document.body.appendChild(form);
//         form.submit();
//         return;
//       }

//       // ========================================
//       // GENERIC REDIRECT URL
//       // ========================================
//       if (response.paymentMethod === "redirect_url" && response.redirectUrl) {
//         console.log("🔄 Generic redirect to:", response.redirectUrl);
//         window.location.href = response.redirectUrl;
//         return;
//       }

//       // If we reach here, something unexpected happened
//       console.error("❌ Unexpected response format:", response);
//       alert("Unexpected payment response. Please try again.");
//       setLoading(false);

//     } catch (err) {
//       console.error("❌ Payment initiation error:", err);
//       alert(err.response?.data?.message || "Payment failed. Please try again.");
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-[80vh] flex flex-col justify-center items-center px-6">
//       <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
//         <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
//           Initiate Payment
//         </h2>

//         <form onSubmit={handlePayment} className="space-y-5">
//           <div>
//             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
//               Amount (₹)
//             </label>
//             <input
//               type="number"
//               min="1"
//               step="0.01"
//               value={amount}
//               onChange={(e) => setAmount(e.target.value)}
//               required
//               placeholder="Enter amount"
//               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
//                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
//                        focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
//               Description (Optional)
//             </label>
//             <input
//               type="text"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               placeholder="e.g., Order #12345"
//               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
//                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
//                        focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
//               Select Payment Gateway
//             </label>
//             <select
//               value={gateway}
//               onChange={(e) => setGateway(e.target.value)}
//               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
//                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
//                        focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             >
//               <option value="payu">PayU (India)</option>
//               <option value="razorpay">Razorpay (Recommended)</option>
//               <option value="cashfree">Cashfree</option>
//               <option value="paytm">Paytm</option>
//               <option value="paypal">PayPal (International)</option>
//             </select>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
//                      text-white font-semibold py-3 rounded-lg transition-colors
//                      disabled:cursor-not-allowed"
//           >
//             {loading ? "Processing..." : "Pay Now"}
//           </button>
//         </form>

//         {user && (
//           <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
//             <p className="text-sm text-gray-600 dark:text-gray-400">
//               <span className="font-medium">Paying as:</span> {user.name || user.email}
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



// frontend/src/pages/Payments.jsx
import { useState, useEffect } from "react";
import api from "@/api/axios";
import { useAuth } from "@/context/useAuth";

export default function Payments() {
  const { user } = useAuth();

  const [gateway, setGateway] = useState("payu");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const FRONTEND_BASE = window.location.origin;

  // Load Razorpay SDK on component mount
  useEffect(() => {
    const existing = document.querySelector("#razorpay-sdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!amount) return alert("Enter amount");

    try {
      setLoading(true);

      // Generate unique transaction ID
      const transactionId = `TXN_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const payload = {
        gateway,
        amount: parseFloat(amount),
        currency: "INR",
        transactionId,
        userId: user?._id || user?.id,
        customer: {
          name: user?.name || "Guest User",
          email: user?.email || "guest@example.com",
          phone: user?.phone || "N/A",
        },
        redirect: {
          successUrl: `${FRONTEND_BASE}/payments/success`,
          failureUrl: `${FRONTEND_BASE}/payments/failure`,
          notifyUrl: `${API_BASE}/api/payments/callback/${gateway}`,
        },
        meta: {
          description: description || "Payment",
          linkPurpose: "ORDER_PAYMENT",
          linkTitle: description || "Payment",
        },
      };

      const res = await api.post("/api/payments/initiate", payload);
      const response = res.data?.data || res.data;

      // ========================================
      // RAZORPAY - JavaScript Popup
      // ========================================
      if (response.paymentMethod === "razorpay_js") {
        if (!window.Razorpay) {
          alert("Razorpay SDK not loaded. Please refresh the page.");
          setLoading(false);
          return;
        }

        // Store the MongoDB transaction ID for robust error handling
        const mongoTransactionId = response.transactionId;

        const options = {
          key: response.key,
          amount: response.amount,
          currency: response.currency || "INR",
          name: "UnifiedPay",
          description: description || "Payment",
          order_id: response.orderId,

          // SUCCESS HANDLER
          handler: async function (razorpayResponse) {
            try {
              const verifyPayload = {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                transactionId: response.transactionId, // MongoDB transaction ID
              };

              const verifyRes = await api.post(
                `/api/payments/callback/razorpay`,
                verifyPayload,
                { headers: { "ngrok-skip-browser-warning": "true" } }
              );

              const verifiedTxnId =
                verifyRes?.data?.data?.transactionId || mongoTransactionId;

              window.location.href = `${FRONTEND_BASE}/payments/success?txnid=${verifiedTxnId}&status=paid`;
            } catch (verifyError) {
              console.error("Verification failed:", verifyError);
              alert("Payment verification failed. Please contact support.");
              // Always fall back to stored MongoDB txn id
              window.location.href = `${FRONTEND_BASE}/payments/failure?txnid=${mongoTransactionId}`;
            }
          },

          prefill: response.prefill || {
            name: user?.name || "Guest User",
            email: user?.email || "guest@example.com",
            contact: user?.phone || "N/A",
          },

          theme: { color: "#3399cc" },

          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const razorpayInstance = new window.Razorpay(options);

        // Handle payment failures – always use stored Mongo txn id
        razorpayInstance.on("payment.failed", function (evt) {
          const fallbackId = mongoTransactionId;
          alert(`Payment failed: ${evt?.error?.description || "Unknown error"}`);
          window.location.href = `${FRONTEND_BASE}/payments/failure?txnid=${fallbackId}`;
        });

        razorpayInstance.open();
        return;
      }

      // ========================================
      // CASHFREE - Redirect or JS SDK
      // ========================================
      if (
        response.paymentMethod === "cashfree_js" ||
        response.paymentMethod === "redirect_url"
      ) {
        if (response.redirectUrl) {
          window.location.href = response.redirectUrl;
          return;
        }
      }

      // ========================================
      // PAYTM - JavaScript SDK
      // ========================================
      if (response.paymentMethod === "paytm_js") {
        const script = document.createElement("script");
        script.src = `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${response.mid}.js`;
        script.async = true;

        script.onload = function () {
          const config = {
            root: "",
            flow: "DEFAULT",
            data: {
              orderId: response.orderId,
              token: response.txnToken,
              tokenType: "TXN_TOKEN",
              amount: response.amount,
            },
            handler: {
              notifyMerchant: function (eventName, data) {
                console.log("Paytm notify:", eventName, data);
              },
            },
          };

          window.Paytm.CheckoutJS.init(config)
            .then(() => window.Paytm.CheckoutJS.invoke())
            .catch((error) => {
              console.error("Paytm error:", error);
              setLoading(false);
            });
        };

        script.onerror = function () {
          alert("Failed to load Paytm. Please try again.");
          setLoading(false);
        };

        document.body.appendChild(script);
        return;
      }

      // ========================================
      // PAYU / PAYPAL - Form Redirect
      // ========================================
      if (
        response.paymentMethod === "redirect_form" &&
        response.redirectUrl &&
        response.formData
      ) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = response.redirectUrl;

        Object.entries(response.formData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      // ========================================
      // GENERIC REDIRECT URL
      // ========================================
      if (response.paymentMethod === "redirect_url" && response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }

      // Unexpected format
      alert("Unexpected payment response. Please try again.");
      setLoading(false);
    } catch (err) {
      console.error("Payment initiation error:", err);
      alert(err.response?.data?.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Initiate Payment
        </h2>

        <form onSubmit={handlePayment} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Order #12345"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Select Payment Gateway
            </label>
            <select
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="payu">PayU (India)</option>
              <option value="razorpay">Razorpay (Recommended)</option>
              <option value="cashfree">Cashfree</option>
              <option value="paytm">Paytm</option>
              <option value="paypal">PayPal (International)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white font-semibold py-3 rounded-lg transition-colors
                     disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Pay Now"}
          </button>
        </form>

        {user && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Paying as:</span>{" "}
              {user.name || user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
