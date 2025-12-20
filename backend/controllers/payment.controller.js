// backend/controllers/payment.controller.js
import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import crypto from "crypto";

import { paymentInitiateState } from "../states/paymentInitiateState.js";
import { paymentVerifyState } from "../states/paymentVerifyState.js";
import { paymentRefundState } from "../states/paymentRefundState.js";

import { logGatewayResponse } from "../utils/logGatewayResponse.js";
import Transaction from "../models/transaction.model.js";
import { generateBrandedInvoice } from "../utils/generateBrandedInvoice.js";

const getFrontendBase = () =>
  process.env.FRONTEND_BASE ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

/* ======================================================
   INITIATE PAYMENT (PROJECT SCOPED)
====================================================== */
export const initiatePayment = asyncHandler(async (req, res) => {
  const { gateway, amount, currency, customer, meta, projectId } = req.body;

  // 🔐 AUTH REQUIRED
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Authentication required to initiate payment");
  }

  if (!projectId) {
    throw new ApiError(400, "projectId is required");
  }

  if (!gateway || !amount || !customer?.email) {
    throw new ApiError(
      400,
      "Missing required fields: gateway, amount, customer.email"
    );
  }

  const rawPhone = String(customer.phone || "").trim();
  const normalizedCustomer = {
    name: customer.name || "N/A",
    email: customer.email,
    phone: /^[0-9]{10,}$/.test(rawPhone) ? rawPhone : "9999999999",
  };

  const result = await paymentInitiateState({
    gateway,
    amount,
    currency,
    customer: normalizedCustomer,
    redirect: {
      successUrl:
        req.body?.redirect?.successUrl ||
        `${getFrontendBase()}/payments/success`,
      failureUrl:
        req.body?.redirect?.failureUrl ||
        `${getFrontendBase()}/payments/failure`,
      notifyUrl: req.body?.redirect?.notifyUrl,
    },
    meta: meta || {},
    userId: req.user._id,
    projectId,
    config: req.body.config || {},
  });

  res.status(200).json(result);
});

/* ======================================================
   VERIFY PAYMENT
====================================================== */
export const verifyPayment = asyncHandler(async (req, res) => {
  const gateway = String(req.params.gateway || "").toLowerCase();

  if (gateway === "razorpay") {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transactionId,
    } = { ...(req.body || {}), ...(req.query || {}) };

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !transactionId
    ) {
      throw new ApiError(400, "Missing Razorpay verification fields");
    }

    const secret =
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_TEST_API_SECRET;

    if (!secret) throw new ApiError(500, "Razorpay secret not configured");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (
      razorpay_signature.trim().toLowerCase() !==
      expectedSignature.trim().toLowerCase()
    ) {
      throw new ApiError(400, "Invalid Razorpay signature");
    }

    const txn = await Transaction.findById(transactionId);
    if (!txn) throw new ApiError(404, "Transaction not found");

    txn.status = "paid";
    txn.gatewayPaymentId = razorpay_payment_id;
    txn.gatewayOrderId = razorpay_order_id;
    txn.verifiedAt = new Date();
    await txn.save();

    return res.json({ success: true, data: txn });
  }

  // Other gateways
  const raw = { ...(req.body || {}), ...(req.query || {}) };
  const result = await paymentVerifyState(gateway, raw, {});
  const frontendBase = getFrontendBase();

  return ["paid", "completed"].includes(result.data.status)
    ? res.redirect(`${frontendBase}/payments/success`)
    : res.redirect(`${frontendBase}/payments/failure`);
});

/* ======================================================
   REFUND PAYMENT
====================================================== */
export const refundPayment = asyncHandler(async (req, res) => {
  const { transactionId, amount, reason, config } = req.body;
  if (!transactionId) throw new ApiError(400, "transactionId required");

  const result = await paymentRefundState(
    transactionId,
    amount,
    reason,
    config
  );

  await logGatewayResponse({
    gateway: result.gateway || "unknown",
    type: "refund",
    requestPayload: { transactionId, amount, reason },
    responsePayload: result,
    statusCode: 200,
  });

  res.json({ success: true, data: result });
});

/* ======================================================
   GET TRANSACTION
====================================================== */
export const getTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

  const transaction = isMongoId
    ? await Transaction.findById(id)
    : await Transaction.findOne({ gatewayOrderId: id });

  if (!transaction) throw new ApiError(404, "Transaction not found");

  if (req.query.format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${transaction.transactionId}.pdf`
    );
    return generateBrandedInvoice(transaction).pipe(res);
  }

  res.json({ success: true, data: transaction });
});

/* ======================================================
   GET ALL PAYMENTS
====================================================== */
export const getAllPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== "admin") filter.userId = req.user._id;

  const payments = await Transaction.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

/* ======================================================
   DEV HELPERS
====================================================== */
export const razorpayHealth = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Not available in production");
  }

  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_TEST_API_KEY ||
    "";

  res.json({
    success: true,
    env: process.env.NODE_ENV,
    keyIdPrefix: keyId ? keyId.slice(0, 8) : null,
  });
});

export const razorpayDebugSignature = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Not available in production");
  }

  const { order_id, payment_id } = req.body;
  if (!order_id || !payment_id) {
    throw new ApiError(400, "order_id and payment_id required");
  }

  const secret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_TEST_API_SECRET;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  res.json({
    success: true,
    expectedSignaturePrefix: expectedSignature.slice(0, 10),
  });
});

/* ======================================================
   DELETE TRANSACTION
====================================================== */
export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const txn = await Transaction.findById(id);
  if (!txn) throw new ApiError(404, "Transaction not found");

  await Transaction.findByIdAndDelete(id);
  res.json({ success: true });
});
