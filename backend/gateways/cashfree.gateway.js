import axios from "axios";

export default {

  initiatePayment: async (input) => {
    try {
      const APP_ID = process.env.CASHFREE_APP_ID;
      const SECRET = process.env.CASHFREE_SECRET_KEY;
      const BASE_URL = (process.env.CASHFREE_BASE_URL || "https://sandbox.cashfree.com/pg")
        .replace(/\/$/, "");

      const { amount, transactionId, redirect = {}, customer = {}, meta = {}, currency = "INR" } = input;

      if (!APP_ID || !SECRET) {
        return { ok: false, message: "Missing Cashfree credentials" };
      }

      // Validate required customer fields
      if (!customer?.email || !customer?.phone) {
        return { ok: false, message: "Customer email and phone are required" };
      }

      // Validate and clean phone number
      const rawPhone = customer?.phone;
      if (!rawPhone) {
        return { ok: false, message: "Customer phone is required" };
      }

      // Remove all non-numeric characters
      let cleanPhone = rawPhone.toString().replace(/\D/g, "");

      // Remove country code if present (91 for India)
      if (cleanPhone.startsWith("91") && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10); // Take last 10 digits
      }

      // Final validation
      if (cleanPhone.length !== 10) {
        console.error(`❌ Invalid phone: original="${rawPhone}", cleaned="${cleanPhone}"`);
        return { 
          ok: false, 
          message: `Invalid phone format. Received: "${rawPhone}". Need 10-digit Indian mobile number.` 
        };
      }

      console.log(`✅ Phone validated: ${rawPhone} → ${cleanPhone}`);

      const txnAmount = Number(amount).toFixed(2);

      // Generate unique link_id (required by Cashfree)
      const linkId = `link_${transactionId}_${Date.now()}`;

      const payload = {
        link_id: linkId,
        link_amount: parseFloat(txnAmount),
        link_currency: currency,
        link_purpose: "PAYMENT",
        link_notes: {
          description: meta?.description || "Payment",
          transactionId: transactionId,
        },
        customer_details: {
          customer_phone: cleanPhone,
          customer_email: customer.email,
          customer_name: customer.name || "Customer",
        },
        link_notify: {
          send_sms: false,
          send_email: false,
        },
      };

      // Add URLs if provided
      if (redirect.notifyUrl) {
        payload.link_notify.send_webhook = true;
        payload.link_meta = {
          notify_url: redirect.notifyUrl,
          return_url: redirect.successUrl || redirect.notifyUrl,
        };
      }

      console.log('🔵 Cashfree Request:', JSON.stringify(payload, null, 2));

      const resp = await axios.post(`${BASE_URL}/links`, payload, {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": APP_ID,
          "x-client-secret": SECRET,
          "x-api-version": "2023-08-01",
        },
        timeout: 10000,
      });

      console.log('🟢 Cashfree Response:', JSON.stringify(resp.data, null, 2));

      const linkUrl = resp.data?.link_url;

      if (!linkUrl) {
        return { ok: false, message: "Cashfree did not return link_url" };
      }

      return {
        ok: true,
        message: "Cashfree initiate success",
        data: {
          paymentMethod: "redirect_url",
          redirectUrl: linkUrl,
          gatewayOrderId: linkId,
          raw: resp.data,
        },
      };

    } catch (err) {
      console.error('🔴 Cashfree Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      return {
        ok: false,
        message: err.response?.data?.message || "Cashfree initiate error",
        raw: err.response?.data || err.message,
      };
    }
  },

  verifyPayment: async (input) => {
    try {
      const { callbackPayload } = input;

      console.log('🔵 Cashfree verifyPayment called with:', JSON.stringify(callbackPayload, null, 2));

      // Extract order_id from different webhook types
      const orderId =
        callbackPayload?.data?.order?.order_id ||
        callbackPayload?.data?.link_id ||
        callbackPayload?.data?.order_id ||
        null;

      const paymentId =
        callbackPayload?.data?.payment?.cf_payment_id ||
        callbackPayload?.data?.order?.transaction_id ||
        null;

      const statusRaw =
        callbackPayload?.data?.payment?.payment_status ||
        callbackPayload?.data?.link_status ||
        callbackPayload?.data?.order?.transaction_status ||
        "";

      // Map Cashfree statuses to your internal statuses
      const normalized =
        {
          SUCCESS: "paid",
          PAID: "paid",
          COMPLETED: "paid",
          SETTLED: "paid",
          PENDING: "processing",
          FAILED: "failed",
          ACTIVE: "processing",
        }[statusRaw.toUpperCase()] || "processing";

      if (!orderId) {
        return { ok: false, message: "Missing order_id in callback" };
      }

      // Extract original transactionId from link_notes or order_tags
      const transactionId =
        callbackPayload?.data?.link_notes?.transactionId ||
        callbackPayload?.data?.order?.order_tags?.transactionId ||
        orderId;

      console.log(`✅ Cashfree verify: orderId=${orderId}, transactionId=${transactionId}, status=${normalized}`);

      return {
        ok: true,
        message: "Cashfree verified",
        data: {
          status: normalized,
          transactionId: transactionId,
          gatewayPaymentId: paymentId?.toString() || orderId,
          gatewayOrderId: orderId,
        },
      };

    } catch (err) {
      console.error('❌ Cashfree verify error:', err);
      return { ok: false, message: "Cashfree verify error", raw: err.message };
    }
  },

  refundPayment: async (input) => {
    try {
      const { gatewayOrderId, amount, reason, config = {} } = input;
      const { appId, secretKey, baseUrl } = config;

      if (!gatewayOrderId) return { ok: false, message: "gatewayOrderId required" };

      const refundPayload = {
        refund_amount: Number(amount),
        refund_note: reason || "Refund",
      };

      const response = await axios.post(`${baseUrl}/links/${gatewayOrderId}/refunds`, refundPayload, {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": "2023-08-01",
        },
      });

      const data = response.data;

      return {
        ok: true,
        message: "Cashfree refund processed",
        data: {
          status: data.refund_status === "SUCCESS" ? "refunded" : "processing",
          refundId: data.cf_refund_id,
          amount: data.refund_amount,
        },
        raw: data,
      };
    } catch (err) {
      return { ok: false, message: "Cashfree refund error", raw: err.message };
    }
  },
};