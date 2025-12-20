// backend/states/paymentInitiateState.js
import Transaction from "../models/transaction.model.js";
import gatewayFactory from "../factory/gatewayFactory.js";
import ApiError from "../utils/apiError.js";

export const paymentInitiateState = async (input) => {
  const {
    gateway,
    amount,
    currency = "INR",
    customer,
    redirect,
    meta = {},
    userId,
    projectId, // ✅ ACCEPT projectId
    config,
  } = input;

  // --------------------------------------------------
  // DEBUG LOG (keep this for now)
  // --------------------------------------------------
  console.log("📥 Payment initiate input:", JSON.stringify(input, null, 2));

  // --------------------------------------------------
  // BASIC VALIDATION
  // --------------------------------------------------
  if (!gateway || !amount || !customer?.email) {
    throw new ApiError(400, "Missing required payment fields");
  }

  if (!userId) {
    throw new ApiError(400, "userId is required for transaction creation");
  }

  if (!projectId) {
    throw new ApiError(400, "projectId is required for transaction creation");
  }

  // --------------------------------------------------
  // GATEWAY-SPECIFIC VALIDATION
  // --------------------------------------------------
  if (gateway === "cashfree") {
    if (!customer?.phone) {
      throw new ApiError(400, "Phone number is required for Cashfree payments");
    }

    const phoneDigits = customer.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      throw new ApiError(400, "Phone number must be at least 10 digits");
    }
  }

  const { ok, adapter } = gatewayFactory(gateway);
  if (!ok) throw new ApiError(400, "Unsupported gateway");

  // --------------------------------------------------
  // ✅ CREATE TRANSACTION (FIX IS HERE)
  // --------------------------------------------------
  const transaction = await Transaction.create({
    userId,
    project: projectId, // 🔥 REQUIRED FIX
    gateway,
    amount,
    currency,
    status: "pending",
    customer: {
      name: customer.name || "Customer",
      email: customer.email || "",
      phone: customer.phone || "",
    },
    meta,
    initiatedAt: new Date(),
    transactionId: null,
  });

  // --------------------------------------------------
  // ADAPTER INPUT
  // --------------------------------------------------
  const adapterInput = {
    amount,
    currency,
    transactionId: transaction._id.toString(),
    customer: {
      name: customer.name || "Customer",
      email: customer.email || "",
      phone: customer.phone || "",
    },
    redirect: {
      successUrl: redirect?.successUrl || "",
      failureUrl: redirect?.failureUrl || "",
      notifyUrl: redirect?.notifyUrl || redirect?.successUrl || "",
    },
    meta,
    config: config || {},
  };

  const result = await adapter.initiatePayment(adapterInput);

  if (!result.ok) {
    transaction.status = "failed";
    transaction.failureReason = result.message || "Gateway initiation failed";
    await transaction.save();
    throw new ApiError(500, result.message || "Gateway initiate error");
  }

  // --------------------------------------------------
  // CASHFREE SPECIAL HANDLING
  // --------------------------------------------------
  if (gateway === "cashfree") {
    const raw = result.data?.raw || {};
    const linkId = raw.link_id || result.data?.gatewayOrderId || "";
    const orderId =
      raw.order_id ||
      raw.cf_order_id ||
      raw.payment?.cf_payment_id ||
      "";

    transaction.cashfreeLinkId = linkId;
    transaction.cashfreeOrderId = orderId;
    transaction.gatewayOrderId = linkId;
  } else {
    transaction.gatewayOrderId =
      result.data?.gatewayOrderId ||
      result.data?.orderId ||
      result.data?.params?.txnid ||
      transaction._id.toString();
  }

  transaction.transactionId = transaction._id.toString();
  await transaction.save();

// -----------------------------
// RETURN DATA FOR FRONTEND
// -----------------------------
if (gateway === "razorpay") {
  return {
    ok: true,
    success: true,
    message: "Razorpay order created",
    data: {
      transactionId: transaction._id.toString(),
      razorpayOrderId:
        result.data?.gatewayOrderId ||
        result.data?.orderId ||
        result.data?.id,
      key:
        process.env.RAZORPAY_KEY_ID ||
        process.env.RAZORPAY_TEST_API_KEY,
    },
  };
}

// Default (PayU, Cashfree, PayPal, etc.)
return {
  ok: true,
  success: true,
  message: "Payment initiation successful",
  data: {
    transactionId: transaction._id.toString(),
    ...result.data,
  },
};


};
