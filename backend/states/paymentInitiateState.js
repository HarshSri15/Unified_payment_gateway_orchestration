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
    config,
  } = input;

  // ✅ Step 1: Add logging to see what's being received
  console.log('📥 Payment initiate input:', JSON.stringify(input, null, 2));

  // ✅ Step 2: Basic validation
  if (!gateway || !amount || !customer?.email) {
    throw new ApiError(400, "Missing required payment fields");
  }

  if (!userId) {
    throw new ApiError(400, "userId is required for transaction creation");
  }

  // ✅ Step 3: Gateway-specific validation (NEW - Solution 3)
  if (gateway === "cashfree") {
    if (!customer?.phone) {
      throw new ApiError(400, "Phone number is required for Cashfree payments");
    }
    
    // Optional: Validate phone format early
    const phoneDigits = customer.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      throw new ApiError(400, "Phone number must be at least 10 digits");
    }
  }

  const { ok, adapter } = gatewayFactory(gateway);
  if (!ok) throw new ApiError(400, "Unsupported gateway");

  // ✅ Step 4: Create DB transaction with better defaults
  const transaction = await Transaction.create({
    userId,
    gateway,
    amount,
    currency,
    status: "pending",
    customer: {
      name: customer.name || "Customer",  // ✅ Changed from "N/A"
      email: customer.email || "",         // ✅ Changed from "N/A"
      phone: customer.phone || "",         // ✅ Changed from "N/A"
    },
    meta,
    initiatedAt: new Date(),
    transactionId: null,
  });

  // ✅ Step 5: Prepare standardized adapter input (already correct)
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

  // Adapter handles everything gateway-specific
  const result = await adapter.initiatePayment(adapterInput);

  if (!result.ok) {
    transaction.status = "failed";
    transaction.failureReason = result.message || "Gateway initiation failed";
    await transaction.save();
    throw new ApiError(500, result.message || "Gateway initiate error");
  }

  // ---------------------------------------------------
  // SPECIAL CASE: CASHFREE (store link_id + order_id)
  // ---------------------------------------------------
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

    // keep gatewayOrderId = link_id for compatibility
    transaction.gatewayOrderId = linkId;
  } else {
    // default for all other gateways
    transaction.gatewayOrderId =
      result.data?.gatewayOrderId ||
      result.data?.orderId ||
      result.data?.params?.txnid ||
      transaction._id.toString();
  }

  // always store our own transaction reference
  transaction.transactionId = transaction._id.toString();

  await transaction.save();

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