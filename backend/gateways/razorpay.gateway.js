// backend/gateways/razorpay.gateway.js
import axios from "axios";
import crypto from "crypto";

/**
 * Support both naming schemes:
 *  - RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 *  - RAZORPAY_TEST_API_KEY / RAZORPAY_TEST_API_SECRET
 */
const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_TEST_API_KEY;
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_TEST_API_SECRET;

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function assertCreds() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay credentials missing. Set RAZORPAY_KEY_ID/SECRET or RAZORPAY_TEST_API_KEY/SECRET."
    );
  }
}

export default {
  // =========================================================
  // INITIATE PAYMENT — Razorpay Standard Checkout (popup)
  // =========================================================
  initiatePayment: async (input) => {
    try {
      assertCreds();

      const amountInRupees = Number(input.amount);
      if (!amountInRupees || isNaN(amountInRupees) || amountInRupees <= 0) {
        return { ok: false, message: "Invalid amount for Razorpay" };
      }

      const currency = (input.currency || "INR").toUpperCase();
      const amountInPaise = Math.round(amountInRupees * 100);

      const orderPayload = {
        amount: amountInPaise,
        currency,
        receipt:
          input?.meta?.receipt ||
          `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        payment_capture: 1,
        notes: {
          purpose: input?.meta?.linkPurpose || "ORDER_PAYMENT",
          title: input?.meta?.linkTitle || "Payment",
        },
      };

      const orderRes = await axios.post(
        `${RAZORPAY_API_BASE}/orders`,
        orderPayload,
        {
          auth: { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET },
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );

      const order = orderRes.data;

      return {
        ok: true,
        message: "Razorpay order created",
        data: {
          paymentMethod: "razorpay_js",
          key: RAZORPAY_KEY_ID,
          amount: order.amount, // paise
          currency: order.currency || currency,
          orderId: order.id,
          gatewayOrderId: order.id,
          prefill: {
            name: input?.customer?.name || "Guest User",
            email: input?.customer?.email || "guest@example.com",
            contact: input?.customer?.phone || "",
          },
        },
      };
    } catch (err) {
      console.error(
        "RAZORPAY INITIATE ERROR:",
        err?.response?.data || err?.message || err
      );
      return {
        ok: false,
        message: "Razorpay initiate error",
        raw: err?.response?.data || err?.message || err,
      };
    }
  },

  // =========================================================
  // VERIFY PAYMENT — HMAC signature check
  // =========================================================
  verifyPayment: async (callbackPayload /*, config */) => {
    try {
      assertCreds();

      const orderId =
        callbackPayload.razorpay_order_id || callbackPayload.order_id;
      const paymentId =
        callbackPayload.razorpay_payment_id || callbackPayload.payment_id;
      const signature =
        callbackPayload.razorpay_signature || callbackPayload.signature;

      if (!orderId || !paymentId || !signature) {
        return { ok: false, message: "Missing Razorpay verification fields" };
        }
      // Compute expected signature: sha256(order_id + "|" + payment_id)
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest("hex");

      const provided = String(signature).trim().toLowerCase();
      const expected = String(expectedSignature).trim().toLowerCase();
      const isValid = provided === expected;

      if (!isValid) {
        if (process.env.NODE_ENV !== "production") {
          console.error("RAZORPAY SIGNATURE MISMATCH", {
            orderId,
            paymentId,
            providedSigPrefix: provided.slice(0, 10),
            expectedSigPrefix: expected.slice(0, 10),
            usingEnvKeys: {
              KEY_ID: !!process.env.RAZORPAY_KEY_ID,
              KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
              TEST_KEY: !!process.env.RAZORPAY_TEST_API_KEY,
              TEST_SECRET: !!process.env.RAZORPAY_TEST_API_SECRET,
            },
          });
        }
        return { ok: false, message: "Invalid Razorpay signature" };
      }

      return {
        ok: true,
        message: "Razorpay verified",
        data: {
          status: "paid",
          gatewayPaymentId: paymentId,
          gatewayOrderId: orderId,
        },
      };
    } catch (err) {
      console.error(
        "RAZORPAY VERIFY ERROR:",
        err?.response?.data || err?.message || err
      );
      return {
        ok: false,
        message: "Razorpay verify error",
        raw: err?.response?.data || err?.message || err,
      };
    }
  },
};
