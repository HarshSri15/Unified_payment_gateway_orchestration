// backend/states/paymentVerifyState.js
import mongoose from "mongoose";
import ApiError from "../utils/apiError.js";
import gatewayFactory from "../factory/gatewayFactory.js";
import Transaction from "../models/transaction.model.js";

export const paymentVerifyState = async (
  gatewayName,
  callbackPayload,
  config
) => {
  const { ok, adapter } = gatewayFactory(gatewayName);
  if (!ok) throw new ApiError(400, "Unsupported gateway");

  // MAIN reference (order_id, ORDERID, txnid, etc.)
  let extractedRef =
    callbackPayload?.ORDERID ||
    callbackPayload?.orderId ||
    callbackPayload?.order_id ||
    callbackPayload?.txnid ||
    callbackPayload?.transactionId ||
    callbackPayload?.token ||
    callbackPayload?.data?.order_id ||
    callbackPayload?.data?.order?.order_id ||
    callbackPayload?.gatewayOrderId ||
    null;

  // Cashfree link_id / cf_link_id as SECONDARY reference
  const linkRef =
    callbackPayload?.data?.order?.order_tags?.link_id ||
    callbackPayload?.data?.order?.order_tags?.cf_link_id ||
    null;

  console.log("=== VERIFY STATE DEBUG ===");
  console.log("Gateway:", gatewayName);
  console.log("ExtractedRef (main):", extractedRef);
  console.log("LinkRef (order_tags):", linkRef);
  console.log("Callback Payload:", JSON.stringify(callbackPayload, null, 2));
  console.log("==========================");

  if (!extractedRef && !linkRef) {
    throw new ApiError(400, "Missing transaction reference");
  }

  // Build OR conditions using all possible refs
  const conditions = [];

  // Use main ref (order_id, ORDERID, etc.)
  if (extractedRef) {
    conditions.push(
      { gatewayOrderId: extractedRef },
      { transactionId: extractedRef },
      { gatewayPaymentId: extractedRef }
    );

    if (mongoose.Types.ObjectId.isValid(extractedRef)) {
      conditions.push({ _id: extractedRef });
    }
  }

  // Also try linkRef (Cashfree link_id / cf_link_id)
  if (linkRef) {
    conditions.push(
      { gatewayOrderId: linkRef },
      { transactionId: linkRef },
      { gatewayPaymentId: linkRef }
    );

    if (mongoose.Types.ObjectId.isValid(linkRef)) {
      conditions.push({ _id: linkRef });
    }
  }

  const transaction = await Transaction.findOne({ $or: conditions });

  if (!transaction) {
    console.error(
      "❌ paymentVerifyState: Transaction not found for refs:",
      { extractedRef, linkRef }
    );
    throw new ApiError(404, "Transaction not found");
  }

  // Call adapter verify
  const result = await adapter.verifyPayment({
    callbackPayload,
    config,
  });

  if (!result.ok) {
    throw new ApiError(502, result.message || "Gateway verification failed");
  }

  // Normalize and save
  transaction.status = result.data.status;

  if (result.data.gatewayPaymentId) {
    transaction.gatewayPaymentId = result.data.gatewayPaymentId;
  }

  if (result.data.amount) {
    transaction.amount = result.data.amount;
  }

  // NOTE: Only keep this if you really want to overwrite gatewayOrderId
  // with whatever the adapter returns as "transactionId".
  if (result.data.transactionId) {
    transaction.gatewayOrderId = result.data.transactionId;
  }

  transaction.verifiedAt = new Date();
  await transaction.save();

  console.log("Transaction saved:", {
    id: transaction._id.toString(),
    status: transaction.status,
    gatewayOrderId: transaction.gatewayOrderId,
    gatewayPaymentId: transaction.gatewayPaymentId,
    amount: transaction.amount,
  });

  return {
    ok: true,
    message: "Transaction verified",
    data: {
      transactionId: transaction._id.toString(),
      status: transaction.status,
      gatewayPaymentId: transaction.gatewayPaymentId,
    },
  };
};
