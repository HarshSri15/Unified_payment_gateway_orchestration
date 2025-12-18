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
  try {
    const { gateway, amount, currency, customer, meta, projectId } = req.body;

    if (!projectId) {
      throw new ApiError(400, "projectId is required for payment");
    }

    if (!gateway || !amount || !customer?.email) {
      throw new ApiError(
        400,
        "Missing required fields: gateway, amount or customer.email"
      );
    }

    const rawPhone = String(customer?.phone || "").trim();
    const normalizedCustomer = {
      name: customer?.name || "N/A",
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
      userId: req.user?._id || req.body.userId,
      projectId,
      config: req.body.config || {},
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV !== "production" && { raw: err }),
    });
  }
});

/* ======================================================
   VERIFY PAYMENT
====================================================== */
export const verifyPayment = asyncHandler(async (req, res) => {
  const gateway = String(req.params.gateway || "").toLowerCase();

  // Razorpay direct verification
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

    if (!secret) {
      throw new ApiError(500, "Razorpay secret not configured");
    }

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

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        transactionId: txn._id,
        status: txn.status,
      },
    });
  }

  // Other gateways
  try {
    const raw = { ...(req.body || {}), ...(req.query || {}) };
    const result = await paymentVerifyState(gateway, raw, {});

    const frontendBase = getFrontendBase();
    const successUrl = `${frontendBase}/payments/success?txnid=${result.data.transactionId}`;
    const failureUrl = `${frontendBase}/payments/failure?txnid=${result.data.transactionId}`;

    return ["paid", "completed"].includes(result.data.status)
      ? res.redirect(successUrl)
      : res.redirect(failureUrl);
  } catch (err) {
    return res.redirect(`${getFrontendBase()}/payments/failure`);
  }
});

/* ======================================================
   REFUND PAYMENT
====================================================== */
export const refundPayment = asyncHandler(async (req, res) => {
  const { transactionId, amount, reason, config } = req.body;
  if (!transactionId) throw new ApiError(400, "transactionId is required");

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
    message: "Refund processed",
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/* ======================================================
   GET SINGLE TRANSACTION
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

  res.status(200).json({ success: true, data: transaction });
});

/* ======================================================
   GET ALL PAYMENTS
====================================================== */
export const getAllPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user?.role !== "admin") filter.userId = req.user._id;

  const payments = await Transaction.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: payments,
  });
});
/* ======================================================
   DEV HELPERS (USED BY ROUTES)
====================================================== */

export const razorpayHealth = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Not available in production");
  }

  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_TEST_API_KEY ||
    "";

  return res.status(200).json({
    success: true,
    env: process.env.NODE_ENV || "development",
    keyIdPrefix: keyId ? keyId.slice(0, 8) : null,
  });
});

export const razorpayDebugSignature = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Not available in production");
  }

  const { order_id, payment_id } = req.body || {};
  if (!order_id || !payment_id) {
    throw new ApiError(400, "order_id and payment_id are required");
  }

  const secret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_TEST_API_SECRET;

  if (!secret) {
    throw new ApiError(500, "No Razorpay secret configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  return res.status(200).json({
    success: true,
    expectedSignaturePrefix: expectedSignature.slice(0, 10),
    hint: "Compare this prefix with razorpay_signature from webhook",
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

  res.status(200).json({
    success: true,
    message: "Transaction deleted successfully",
  });
});
